#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <assert.h>
#include <fcntl.h>
#include <gbm.h>
#include <stdbool.h>
#include <string.h>
#include <libudev.h>
#include <malloc.h>
#include <unistd.h>
#include "westfield-drm.h"

static PFNEGLQUERYWAYLANDBUFFERWL eglQueryWaylandBufferWL = 0;
static PFNEGLBINDWAYLANDDISPLAYWL eglBindWaylandDisplayWL = 0;

struct westfield_drm {
    int device_fd;
    struct wl_display *wl_display;
    struct gbm_device *gbm_device;
    EGLDisplay egl_display;
    EGLContext egl_context;
};

static inline void
load_pointers() {
    eglBindWaylandDisplayWL = (PFNEGLBINDWAYLANDDISPLAYWL)
            eglGetProcAddress("eglBindWaylandDisplayWL");
    eglQueryWaylandBufferWL = (PFNEGLQUERYWAYLANDBUFFERWL)
            eglGetProcAddress("eglQueryWaylandBufferWL");
}

static inline char *
boot_gpu_devpath() {
    char *devpath;
    struct udev *udev = udev_new();
    struct udev_enumerate *enu = udev_enumerate_new(udev);
    udev_enumerate_add_match_sysattr(enu, "boot_vga", "1");
    udev_enumerate_scan_devices(enu);
    struct udev_list_entry *cur;
    udev_list_entry_foreach(cur, udev_enumerate_get_list_entry(enu)) {
        struct udev_device *dev = udev_device_new_from_syspath(udev,
                                                               udev_list_entry_get_name(cur));
        udev_enumerate_unref(enu);
        enu = udev_enumerate_new(udev);
        udev_enumerate_add_match_parent(enu, dev);
        udev_enumerate_add_match_sysname(enu, "card[0-9]");
        udev_enumerate_scan_devices(enu);
        udev_device_unref(dev);
        udev_list_entry_foreach(cur, udev_enumerate_get_list_entry(enu)) {
            dev = udev_device_new_from_syspath(udev,
                                               udev_list_entry_get_name(cur));
            const char *str = udev_device_get_devnode(dev);
            devpath = malloc((strlen(str)+1)*sizeof(char));
            strcpy(devpath, str);
            udev_device_unref(dev);
            udev_enumerate_unref(enu);
            break;
        }
        break;
    }
    return devpath;
}

struct westfield_drm *
westfield_drm_new(struct wl_display *wl_display) {
    struct westfield_drm *westfield_drm = calloc(sizeof (struct westfield_drm), 1);
    bool res;
    char *devpath = boot_gpu_devpath();

    int32_t fd = open(devpath, O_RDWR|O_CLOEXEC|O_NOCTTY|O_NONBLOCK);
    assert (fd > 0);
    free(devpath);
    westfield_drm->device_fd = fd;

    struct gbm_device *gbm_device = gbm_create_device (fd);
    assert (gbm_device != NULL);
    westfield_drm->gbm_device = gbm_device;

    /* setup EGL from the GBM device */
    load_pointers();
    EGLDisplay egl_display = eglGetPlatformDisplay (EGL_PLATFORM_GBM_MESA, gbm_device, NULL);
    if (egl_display == EGL_NO_DISPLAY) {
        fprintf(stderr, "eglGetPlatformDisplay failed\n");
    }
    westfield_drm->egl_display = egl_display;

    EGLint major, minor;
    if (eglInitialize(egl_display, &major, &minor) == EGL_FALSE) {
        fprintf(stderr, "eglInitialize failed\n");
    }
    printf("EGL %i.%i initialized\n", major, minor);

//    const char *egl_extension_st = eglQueryString (egl_display, EGL_EXTENSIONS);
//    assert (strstr (egl_extension_st, "EGL_KHR_create_context") != NULL);
//    assert (strstr (egl_extension_st, "EGL_KHR_surfaceless_context") != NULL);

    if (eglBindWaylandDisplayWL(egl_display, wl_display) == EGL_FALSE) {
        fprintf(stderr, "eglBindWaylandDisplayWL failed\n");
    }

    if (eglBindAPI(EGL_OPENGL_ES_API) == EGL_FALSE) {
        fprintf(stderr, "eglBindAPI failed\n");
    }

    // 	`size` is the upper value of the possible values of `matching`
    const int size = 1;
    int matching;
    //    const EGLint attrib_required[] = {
//            EGL_CONTEXT_CLIENT_VERSION, 3,
//            EGL_NONE
//    };
    const EGLint attrib_required[] = {
            EGL_COLOR_BUFFER_TYPE, EGL_RGB_BUFFER,
            EGL_RED_SIZE, 8,
            EGL_GREEN_SIZE, 8,
            EGL_BLUE_SIZE, 8,
            EGL_ALPHA_SIZE, 8,
            EGL_DEPTH_SIZE, 24,
            EGL_SURFACE_TYPE, EGL_WINDOW_BIT,
            EGL_RENDERABLE_TYPE, EGL_OPENGL_ES3_BIT,
            EGL_NATIVE_RENDERABLE, EGL_TRUE,
            EGL_NATIVE_VISUAL_ID, GBM_FORMAT_XRGB8888,
            EGL_NONE};

    EGLConfig *config = malloc(size*sizeof(EGLConfig));
    eglChooseConfig(egl_display, attrib_required, config, size, &matching);
    //printf("EGLConfig matching: %i (requested: %i)\n", matching, size);

    const EGLint attribs[] = {EGL_CONTEXT_CLIENT_VERSION, 3, EGL_NONE};

    EGLContext egl_context = eglCreateContext(egl_display, *config, EGL_NO_CONTEXT, attribs);
    if (egl_context == EGL_NO_CONTEXT) {
        fprintf(stderr, "eglGetCreateContext failed\n");
    }
    westfield_drm->egl_context = egl_context;

//    if (eglMakeCurrent(egl_display, EGL_NO_SURFACE, EGL_NO_SURFACE, egl_context) == EGL_FALSE) {
//        fprintf(stderr, "eglMakeCurrent failed\n");
//    }

    return westfield_drm;
}

void
westfield_drm_finalize(struct westfield_drm *westfield_drm) {
    close(westfield_drm->device_fd);
}

void*
westfield_drm_get_egl_context(struct westfield_drm *westfield_drm) {
    return westfield_drm->egl_context;
}

void*
westfield_drm_get_egl_display(struct westfield_drm *westfield_drm) {
    return westfield_drm->egl_display;
}

unsigned int
westfield_drm_wl_buffer_query_egl(struct westfield_drm *westfield_drm, struct wl_resource *buffer) {
    EGLint texture_format;
    return eglQueryWaylandBufferWL(westfield_drm->egl_display, buffer, EGL_TEXTURE_FORMAT,
                                   &texture_format);
}

//EGLImage egl_create_image(struct westfield_drm *westfield_drm, struct wl_resource *buffer, EGLint
//*width, EGLint *height) {
//    eglQueryWaylandBufferWL(egl->display, buffer, EGL_WIDTH, width);
//    eglQueryWaylandBufferWL(egl->display, buffer, EGL_WIDTH, height);
//    EGLAttrib attribs = EGL_NONE;
//    EGLImage image = eglCreateImage(egl->display, EGL_NO_CONTEXT,
//                                    EGL_WAYLAND_BUFFER_WL, buffer, &attribs);
//    if (image == EGL_NO_IMAGE) {
//        printf("AHIAHAH\n");
//    }
//    return image;
//}

