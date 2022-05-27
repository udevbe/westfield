#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <assert.h>
#include <fcntl.h>
#include <gbm.h>
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

    // 	`size` is the upper value of the possible values of `matching`
    const int size = 1;
    EGLConfig *config = calloc(size*sizeof(EGLConfig),1);
    EGLDisplay egl_display;
    EGLint major, minor;
    EGLContext egl_context;

    char *devpath = boot_gpu_devpath();

    int32_t fd = open(devpath, O_RDWR|O_CLOEXEC|O_NOCTTY|O_NONBLOCK);
    assert (fd > 0);
    free(devpath);
    westfield_drm->device_fd = fd;

    struct gbm_device *gbm_device = gbm_create_device (fd);
    if(gbm_device == NULL) {
        fprintf(stderr, "gbm_create_device failed\n");
        goto err;
    }
    westfield_drm->gbm_device = gbm_device;

    /* setup EGL from the GBM device */
    load_pointers();
    egl_display = eglGetPlatformDisplay (EGL_PLATFORM_GBM_MESA, gbm_device, NULL);
    if (egl_display == EGL_NO_DISPLAY) {
        fprintf(stderr, "eglGetPlatformDisplay failed\n");
        goto err;
    }
    westfield_drm->egl_display = egl_display;

    if (eglInitialize(egl_display, &major, &minor) == EGL_FALSE) {
        fprintf(stderr, "eglInitialize failed\n");
        goto err;
    }
    printf("EGL %i.%i initialized\n", major, minor);

// TODO enable once gstreamer can deal with our egl context
//    if (eglBindWaylandDisplayWL(egl_display, wl_display) == EGL_FALSE) {
//        fprintf(stderr, "eglBindWaylandDisplayWL failed\n");
//    }

    return westfield_drm;

    err:
        westfield_drm_finalize(westfield_drm);
        free(westfield_drm);
        free(config);
        return NULL;
}

void
westfield_drm_finalize(struct westfield_drm *westfield_drm) {
    gbm_device_destroy(westfield_drm->gbm_device);
    close(westfield_drm->device_fd);
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

EGLImage egl_create_image(struct westfield_drm *westfield_drm, struct wl_resource *buffer, EGLint
                            *width, EGLint *height) {
    eglQueryWaylandBufferWL(westfield_drm->egl_display, buffer, EGL_WIDTH, width);
    eglQueryWaylandBufferWL(westfield_drm->egl_display, buffer, EGL_WIDTH, height);
    EGLAttrib attribs = EGL_NONE;
    EGLImage image = eglCreateImage(westfield_drm->egl_display, EGL_NO_CONTEXT,
                                    EGL_WAYLAND_BUFFER_WL, buffer, &attribs);
    if (image == EGL_NO_IMAGE) {
        return NULL;
    }
    return image;
}

