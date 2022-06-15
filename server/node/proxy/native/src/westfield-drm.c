#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <drm/drm_fourcc.h>
#include <assert.h>
#include <fcntl.h>
#include <gbm.h>
#include <string.h>
#include <libudev.h>
#include <malloc.h>
#include <unistd.h>
#include <xf86drm.h>
#include <stdlib.h>
#include "westfield-drm.h"
#include "westfield-util.h"

struct westfield_drm {
    int drm_fd;
    struct {
        struct gbm_device *gbm_device;
        EGLDisplay egl_display;
        EGLContext context;
        EGLConfig config;
        EGLDeviceEXT device; // may be EGL_NO_DEVICE_EXT

        struct {
            // Display extensions
            bool KHR_image_base;
            bool EXT_image_dma_buf_import;
            bool EXT_image_dma_buf_import_modifiers;
            bool IMG_context_priority;

            // Device extensions
            bool EXT_device_drm;
            bool EXT_device_drm_render_node;

            // Client extensions
            bool EXT_device_query;
            bool KHR_platform_gbm;
            bool EXT_platform_device;
        } exts;

        struct {
            PFNEGLGETPLATFORMDISPLAYEXTPROC eglGetPlatformDisplayEXT;
            PFNEGLCREATEIMAGEKHRPROC eglCreateImageKHR;
            PFNEGLDESTROYIMAGEKHRPROC eglDestroyImageKHR;
            PFNEGLQUERYWAYLANDBUFFERWL eglQueryWaylandBufferWL;
            PFNEGLQUERYDMABUFFORMATSEXTPROC eglQueryDmaBufFormatsEXT;
            PFNEGLQUERYDMABUFMODIFIERSEXTPROC eglQueryDmaBufModifiersEXT;
            PFNEGLDEBUGMESSAGECONTROLKHRPROC eglDebugMessageControlKHR;
            PFNEGLQUERYDISPLAYATTRIBEXTPROC eglQueryDisplayAttribEXT;
            PFNEGLQUERYDEVICESTRINGEXTPROC eglQueryDeviceStringEXT;
            PFNEGLQUERYDEVICESEXTPROC eglQueryDevicesEXT;
        } procs;

        bool has_modifiers;
        struct drm_format_set dmabuf_texture_formats;
        struct drm_format_set dmabuf_render_formats;
    } egl;
};

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
        udev_enumerate_add_match_sysname(enu, "renderD128");
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

static int
load_egl_proc(void *proc_ptr, const char *name) {
    void *proc = (void *)eglGetProcAddress(name);
    if (proc == NULL) {
        wfl_log(stderr, "eglGetProcAddress(%s) failed", name);
        return -1;
    }
    *(void **)proc_ptr = proc;
    return 0;
}

static bool
check_egl_ext(const char *exts, const char *ext) {
    size_t extlen = strlen(ext);
    const char *end = exts + strlen(exts);

    while (exts < end) {
        if (*exts == ' ') {
            exts++;
            continue;
        }
        size_t n = strcspn(exts, " ");
        if (n == extlen && strncmp(ext, exts, n) == 0) {
            return true;
        }
        exts += n;
    }
    return false;
}

static const char *
egl_error_str(EGLint error) {
    switch (error) {
        case EGL_SUCCESS:
            return "EGL_SUCCESS";
        case EGL_NOT_INITIALIZED:
            return "EGL_NOT_INITIALIZED";
        case EGL_BAD_ACCESS:
            return "EGL_BAD_ACCESS";
        case EGL_BAD_ALLOC:
            return "EGL_BAD_ALLOC";
        case EGL_BAD_ATTRIBUTE:
            return "EGL_BAD_ATTRIBUTE";
        case EGL_BAD_CONTEXT:
            return "EGL_BAD_CONTEXT";
        case EGL_BAD_CONFIG:
            return "EGL_BAD_CONFIG";
        case EGL_BAD_CURRENT_SURFACE:
            return "EGL_BAD_CURRENT_SURFACE";
        case EGL_BAD_DISPLAY:
            return "EGL_BAD_DISPLAY";
        case EGL_BAD_DEVICE_EXT:
            return "EGL_BAD_DEVICE_EXT";
        case EGL_BAD_SURFACE:
            return "EGL_BAD_SURFACE";
        case EGL_BAD_MATCH:
            return "EGL_BAD_MATCH";
        case EGL_BAD_PARAMETER:
            return "EGL_BAD_PARAMETER";
        case EGL_BAD_NATIVE_PIXMAP:
            return "EGL_BAD_NATIVE_PIXMAP";
        case EGL_BAD_NATIVE_WINDOW:
            return "EGL_BAD_NATIVE_WINDOW";
        case EGL_CONTEXT_LOST:
            return "EGL_CONTEXT_LOST";
    }
    return "unknown error";
}

static void
egl_log(EGLenum error, const char *command, EGLint msg_type,
                    EGLLabelKHR thread, EGLLabelKHR obj, const char *msg) {
    wfl_log(stderr,
             "[EGL] command: %s, error: %s (0x%x), message: %s",
             command, egl_error_str(error), error, msg);
}

static int
egl_create(struct westfield_drm *westfield_drm) {
    const char *client_exts_str = eglQueryString(EGL_NO_DISPLAY, EGL_EXTENSIONS);
    if (client_exts_str == NULL) {
        if (eglGetError() == EGL_BAD_DISPLAY) {
            wfl_log(stderr, "EGL_EXT_client_extensions not supported");
        } else {
            wfl_log(stderr, "Failed to query EGL client extensions");
        }
        return -1;
    }

    wfl_log(stdout, "Supported EGL client extensions: %s", client_exts_str);

    if (!check_egl_ext(client_exts_str, "EGL_EXT_platform_base")) {
        wfl_log(stderr, "EGL_EXT_platform_base not supported");
        return -1;
    }

    if(load_egl_proc(&westfield_drm->egl.procs.eglGetPlatformDisplayEXT,
                  "eglGetPlatformDisplayEXT")) {
        return -1;
    }

    westfield_drm->egl.exts.KHR_platform_gbm = check_egl_ext(client_exts_str,
                                               "EGL_KHR_platform_gbm");

    westfield_drm->egl.exts.EXT_platform_device = check_egl_ext(client_exts_str,
                                                  "EGL_EXT_platform_device");

    if (check_egl_ext(client_exts_str, "EGL_EXT_device_base") || check_egl_ext(client_exts_str, "EGL_EXT_device_enumeration")) {
        load_egl_proc(&westfield_drm->egl.procs.eglQueryDevicesEXT, "eglQueryDevicesEXT");
    }

    if (check_egl_ext(client_exts_str, "EGL_EXT_device_base") || check_egl_ext(client_exts_str, "EGL_EXT_device_query")) {
        westfield_drm->egl.exts.EXT_device_query = true;
        load_egl_proc(&westfield_drm->egl.procs.eglQueryDeviceStringEXT,
                      "eglQueryDeviceStringEXT");
        load_egl_proc(&westfield_drm->egl.procs.eglQueryDisplayAttribEXT,
                      "eglQueryDisplayAttribEXT");
    }

    if (check_egl_ext(client_exts_str, "EGL_KHR_debug")) {
        load_egl_proc(&westfield_drm->egl.procs.eglDebugMessageControlKHR,
                      "eglDebugMessageControlKHR");

        static const EGLAttrib debug_attribs[] = {
                EGL_DEBUG_MSG_CRITICAL_KHR, EGL_TRUE,
                EGL_DEBUG_MSG_ERROR_KHR, EGL_TRUE,
                EGL_DEBUG_MSG_WARN_KHR, EGL_TRUE,
                EGL_DEBUG_MSG_INFO_KHR, EGL_TRUE,
                EGL_NONE,
        };
        westfield_drm->egl.procs.eglDebugMessageControlKHR(egl_log, debug_attribs);
    }

    if (eglBindAPI(EGL_OPENGL_ES_API) == EGL_FALSE) {
        wfl_log(stderr, "Failed to bind to the OpenGL ES API");
        return -1;
    }

    return 0;
}

static bool device_has_name(const drmDevice *device, const char *name) {
    for (size_t i = 0; i < DRM_NODE_MAX; i++) {
        if (!(device->available_nodes & (1 << i))) {
            continue;
        }
        if (strcmp(device->nodes[i], name) == 0) {
            return true;
        }
    }
    return false;
}

static EGLDeviceEXT get_egl_device_from_drm_fd(struct westfield_drm *westfield_drm,
                                               int drm_fd) {
    if (westfield_drm->egl.procs.eglQueryDevicesEXT == NULL) {
        wfl_log(stdout, "EGL_EXT_device_enumeration not supported");
        return EGL_NO_DEVICE_EXT;
    }

    EGLint nb_devices = 0;
    if (!westfield_drm->egl.procs.eglQueryDevicesEXT(0, NULL, &nb_devices)) {
        wfl_log(stderr, "Failed to query EGL devices");
        return EGL_NO_DEVICE_EXT;
    }

    EGLDeviceEXT *devices = calloc(nb_devices, sizeof(EGLDeviceEXT));
    if (devices == NULL) {
        wfl_log(stderr, "Failed to allocate EGL device list");
        return EGL_NO_DEVICE_EXT;
    }

    if (!westfield_drm->egl.procs.eglQueryDevicesEXT(nb_devices, devices, &nb_devices)) {
        wfl_log(stderr, "Failed to query EGL devices");
        return EGL_NO_DEVICE_EXT;
    }

    drmDevice *device = NULL;
    int ret = drmGetDevice(drm_fd, &device);
    if (ret < 0) {
        wfl_log(stderr, "Failed to get DRM device: %s\n", strerror(-ret));
        return EGL_NO_DEVICE_EXT;
    }

    EGLDeviceEXT egl_device = NULL;
    for (int i = 0; i < nb_devices; i++) {
        const char *egl_device_name = westfield_drm->egl.procs.eglQueryDeviceStringEXT(
                devices[i], EGL_DRM_DEVICE_FILE_EXT);
        if (egl_device_name == NULL) {
            continue;
        }

        if (device_has_name(device, egl_device_name)) {
            wfl_log(stdout, "Using EGL device %s\n", egl_device_name);
            egl_device = devices[i];
            break;
        }
    }

    drmFreeDevice(&device);
    free(devices);

    return egl_device;
}

static struct drm_format **
format_set_get_ref(struct drm_format_set *set, uint32_t format) {
    for (size_t i = 0; i < set->len; ++i) {
        if (set->formats[i]->format == format) {
            return &set->formats[i];
        }
    }

    return NULL;
}

static bool
drm_format_add(struct drm_format **fmt_ptr, uint64_t modifier) {
    struct drm_format *fmt = *fmt_ptr;

    if (drm_format_has(fmt, modifier)) {
        return true;
    }

    if (fmt->len == fmt->capacity) {
        size_t capacity = fmt->capacity ? fmt->capacity * 2 : 4;

        fmt = realloc(fmt, sizeof(*fmt) + sizeof(fmt->modifiers[0]) * capacity);
        if (!fmt) {
            wfl_log_errno(stderr, "Allocation failed");
            return false;
        }

        fmt->capacity = capacity;
        *fmt_ptr = fmt;
    }

    fmt->modifiers[fmt->len++] = modifier;
    return true;
}

static struct drm_format *
drm_format_create(uint32_t format) {
    size_t capacity = 4;
    struct drm_format *fmt =
            calloc(1, sizeof(*fmt) + sizeof(fmt->modifiers[0]) * capacity);
    if (!fmt) {
        wfl_log_errno(stderr, "Allocation failed");
        return NULL;
    }
    fmt->format = format;
    fmt->capacity = capacity;
    return fmt;
}

static bool
drm_format_set_add(struct drm_format_set *set, uint32_t format, uint64_t modifier) {
    assert(format != DRM_FORMAT_INVALID);

    struct drm_format **ptr = format_set_get_ref(set, format);
    if (ptr) {
        return drm_format_add(ptr, modifier);
    }

    struct drm_format *fmt = drm_format_create(format);
    if (!fmt) {
        return false;
    }
    if (!drm_format_add(&fmt, modifier)) {
        return false;
    }

    if (set->len == set->capacity) {
        size_t new = set->capacity ? set->capacity * 2 : 4;

        struct drm_format **tmp = realloc(set->formats,
                                              sizeof(*fmt) + sizeof(fmt->modifiers[0]) * new);
        if (!tmp) {
            wfl_log_errno(stderr, "Allocation failed");
            free(fmt);
            return false;
        }

        set->capacity = new;
        set->formats = tmp;
    }

    set->formats[set->len++] = fmt;
    return true;
}

const struct drm_format *drm_format_set_get(const struct drm_format_set *set, uint32_t format) {
    struct drm_format **ptr =
            format_set_get_ref((struct drm_format_set *)set, format);
    return ptr ? *ptr : NULL;
}

static bool
drm_format_set_has(const struct drm_format_set *set, uint32_t format, uint64_t modifier) {
    const struct drm_format *fmt = drm_format_set_get(set, format);
    if (!fmt) {
        return false;
    }
    return drm_format_has(fmt, modifier);
}

static int 
get_egl_dmabuf_modifiers(struct westfield_drm *westfield_drm, int format,
                                    uint64_t **modifiers, EGLBoolean **external_only) {
    *modifiers = NULL;
    *external_only = NULL;

    if (!westfield_drm->egl.exts.EXT_image_dma_buf_import) {
        wfl_log(stdout, "DMA-BUF extension not present");
        return -1;
    }
    if (!westfield_drm->egl.exts.EXT_image_dma_buf_import_modifiers) {
        return 0;
    }

    EGLint num;
    if (!westfield_drm->egl.procs.eglQueryDmaBufModifiersEXT(westfield_drm->egl.egl_display, format, 0,
                                               NULL, NULL, &num)) {
        wfl_log(stderr, "Failed to query dmabuf number of modifiers");
        return -1;
    }
    if (num == 0) {
        return 0;
    }

    *modifiers = calloc(num, sizeof(uint64_t));
    if (*modifiers == NULL) {
        wfl_log_errno(stderr, "Allocation failed");
        return -1;
    }
    *external_only = calloc(num, sizeof(EGLBoolean));
    if (*external_only == NULL) {
        wfl_log_errno(stderr, "Allocation failed");
        free(*modifiers);
        *modifiers = NULL;
        return -1;
    }

    if (!westfield_drm->egl.procs.eglQueryDmaBufModifiersEXT(westfield_drm->egl.egl_display, format, num,
                                               *modifiers, *external_only, &num)) {
        wfl_log(stderr, "Failed to query dmabuf modifiers");
        free(*modifiers);
        free(*external_only);
        return -1;
    }
    return num;
}

static int
get_egl_dmabuf_formats(struct westfield_drm *westfield_drm, int **formats) {
    if (!westfield_drm->egl.exts.EXT_image_dma_buf_import) {
        wfl_log(stdout, "DMA-BUF import extension not present");
        return -1;
    }

    // when we only have the image_dmabuf_import extension we can't query
    // which formats are supported. These two are on almost always
    // supported; it's the intended way to just try to create buffers.
    // Just a guess but better than not supporting dmabufs at all,
    // given that the modifiers extension isn't supported everywhere.
    if (!westfield_drm->egl.exts.EXT_image_dma_buf_import_modifiers) {
        static const int fallback_formats[] = {
                DRM_FORMAT_ARGB8888,
                DRM_FORMAT_XRGB8888,
        };
        static unsigned num = sizeof(fallback_formats) /
                              sizeof(fallback_formats[0]);

        *formats = calloc(num, sizeof(int));
        if (!*formats) {
            wfl_log_errno(stderr, "Allocation failed");
            return -1;
        }

        memcpy(*formats, fallback_formats, num * sizeof(**formats));
        return num;
    }

    EGLint num;
    if (!westfield_drm->egl.procs.eglQueryDmaBufFormatsEXT(westfield_drm->egl.egl_display, 0, NULL, &num)) {
        wfl_log(stderr, "Failed to query number of dmabuf formats");
        return -1;
    }

    *formats = calloc(num, sizeof(int));
    if (*formats == NULL) {
        wfl_log(stderr, "Allocation failed: %s\n", strerror(errno));
        return -1;
    }

    if (!westfield_drm->egl.procs.eglQueryDmaBufFormatsEXT(westfield_drm->egl.egl_display, num, *formats, &num)) {
        wfl_log(stderr, "Failed to query dmabuf format");
        free(*formats);
        return -1;
    }
    return num;
}

static void
init_dmabuf_formats(struct westfield_drm *westfield_drm) {
    int *formats;
    int formats_len = get_egl_dmabuf_formats(westfield_drm, &formats);
    if (formats_len < 0) {
        return;
    }

    bool has_modifiers = false;
    for (int i = 0; i < formats_len; i++) {
        uint32_t fmt = formats[i];

        uint64_t *modifiers;
        EGLBoolean *external_only;
        int modifiers_len =
                get_egl_dmabuf_modifiers(westfield_drm, fmt, &modifiers, &external_only);
        if (modifiers_len < 0) {
            continue;
        }

        has_modifiers = has_modifiers || modifiers_len > 0;

        // EGL always supports implicit modifiers
        drm_format_set_add(&westfield_drm->egl.dmabuf_texture_formats, fmt,
                               DRM_FORMAT_MOD_INVALID);
        drm_format_set_add(&westfield_drm->egl.dmabuf_render_formats, fmt,
                               DRM_FORMAT_MOD_INVALID);

        // TODO enabled other modifiers once gstreamer has explicit modifiers support
//        if (modifiers_len == 0) {
            // Assume the linear layout is supported if the driver doesn't
            // explicitly say otherwise
            drm_format_set_add(&westfield_drm->egl.dmabuf_texture_formats, fmt,
                                   DRM_FORMAT_MOD_LINEAR);
            drm_format_set_add(&westfield_drm->egl.dmabuf_render_formats, fmt,
                                   DRM_FORMAT_MOD_LINEAR);
//        }
//        for (int j = 0; j < modifiers_len; j++) {
//            drm_format_set_add(&westfield_drm->egl.dmabuf_texture_formats, fmt,
//                                   modifiers[j]);
//            if (!external_only[j]) {
//                drm_format_set_add(&westfield_drm->egl.dmabuf_render_formats, fmt,
//                                       modifiers[j]);
//            }
//        }

        free(modifiers);
        free(external_only);
    }

    char *str_formats = malloc(formats_len * 5 + 1);
    if (str_formats == NULL) {
        goto out;
    }
    for (int i = 0; i < formats_len; i++) {
        snprintf(&str_formats[i*5], (formats_len - i) * 5 + 1, "%.4s ",
                 (char*)&formats[i]);
    }
    wfl_log(stdout, "Supported DMA-BUF formats: %s\n", str_formats);
    wfl_log(stdout, "EGL DMA-BUF format modifiers %s\n",
            has_modifiers ? "supported" : "unsupported");
    free(str_formats);

    westfield_drm->egl.has_modifiers = has_modifiers;

    out:
    free(formats);
}

static bool
egl_init_display(struct westfield_drm *westfield_drm, EGLDisplay *display) {
    westfield_drm->egl.egl_display = display;

    EGLint major, minor;
    if (eglInitialize(westfield_drm->egl.egl_display, &major, &minor) == EGL_FALSE) {
        wfl_log(stderr, "Failed to initialize EGL");
        return false;
    }

    const char *display_exts_str = eglQueryString(westfield_drm->egl.egl_display, EGL_EXTENSIONS);
    if (display_exts_str == NULL) {
        wfl_log(stderr, "Failed to query EGL display extensions");
        return false;
    }

    if (check_egl_ext(display_exts_str, "EGL_KHR_image_base")) {
        westfield_drm->egl.exts.KHR_image_base = true;
        load_egl_proc(&westfield_drm->egl.procs.eglCreateImageKHR, "eglCreateImageKHR");
        load_egl_proc(&westfield_drm->egl.procs.eglDestroyImageKHR, "eglDestroyImageKHR");
    }

    westfield_drm->egl.exts.EXT_image_dma_buf_import =
            check_egl_ext(display_exts_str, "EGL_EXT_image_dma_buf_import");
    if (check_egl_ext(display_exts_str,
                      "EGL_EXT_image_dma_buf_import_modifiers")) {
        westfield_drm->egl.exts.EXT_image_dma_buf_import_modifiers = true;
        load_egl_proc(&westfield_drm->egl.procs.eglQueryDmaBufFormatsEXT,
                      "eglQueryDmaBufFormatsEXT");
        load_egl_proc(&westfield_drm->egl.procs.eglQueryDmaBufModifiersEXT,
                      "eglQueryDmaBufModifiersEXT");
    }

    const char *device_exts_str = NULL, *driver_name = NULL;
    if (westfield_drm->egl.exts.EXT_device_query) {
        EGLAttrib device_attrib;
        if (!westfield_drm->egl.procs.eglQueryDisplayAttribEXT(westfield_drm->egl.egl_display,
                                                 EGL_DEVICE_EXT, &device_attrib)) {
            wfl_log(stderr, "eglQueryDisplayAttribEXT(EGL_DEVICE_EXT) failed");
            return false;
        }
        westfield_drm->egl.device = (EGLDeviceEXT)device_attrib;

        device_exts_str =
                westfield_drm->egl.procs.eglQueryDeviceStringEXT(westfield_drm->egl.device, EGL_EXTENSIONS);
        if (device_exts_str == NULL) {
            wfl_log(stderr, "eglQueryDeviceStringEXT(EGL_EXTENSIONS) failed");
            return false;
        }

        if (check_egl_ext(device_exts_str, "EGL_MESA_device_software")) {
            const char *allow_software = getenv("RENDERER_ALLOW_SOFTWARE");
            if (allow_software != NULL && strcmp(allow_software, "1") == 0) {
                wfl_log(stdout, "Using software rendering");
            } else {
                wfl_log(stderr, "Software rendering detected, please use "
                                   "the RENDERER_ALLOW_SOFTWARE environment variable "
                                   "to proceed");
                return false;
            }
        }

#ifdef EGL_DRIVER_NAME_EXT
        if (check_egl_ext(device_exts_str, "EGL_EXT_device_persistent_id")) {
            driver_name = westfield_drm->egl.procs.eglQueryDeviceStringEXT(westfield_drm->egl.device,
                                                             EGL_DRIVER_NAME_EXT);
        }
#endif

        westfield_drm->egl.exts.EXT_device_drm =
                check_egl_ext(device_exts_str, "EGL_EXT_device_drm");
        westfield_drm->egl.exts.EXT_device_drm_render_node =
                check_egl_ext(device_exts_str, "EGL_EXT_device_drm_render_node");
    }

    if (!check_egl_ext(display_exts_str, "EGL_KHR_no_config_context") &&
        !check_egl_ext(display_exts_str, "EGL_MESA_configless_context")) {
        wfl_log(stderr, "EGL_KHR_no_config_context or "
                           "EGL_MESA_configless_context not supported");
        return false;
    }

    if (!check_egl_ext(display_exts_str, "EGL_KHR_surfaceless_context")) {
        wfl_log(stderr, "EGL_KHR_surfaceless_context not supported");
        return false;
    }

    westfield_drm->egl.exts.IMG_context_priority =
            check_egl_ext(display_exts_str, "EGL_IMG_context_priority");

    wfl_log(stdout, "Using EGL %d.%d\n", (int)major, (int)minor);
    wfl_log(stdout, "Supported EGL display extensions: %s\n", display_exts_str);
    if (device_exts_str != NULL) {
        wfl_log(stdout, "Supported EGL device extensions: %s\n", device_exts_str);
    }
    wfl_log(stdout, "EGL vendor: %s\n", eglQueryString(westfield_drm->egl.egl_display, EGL_VENDOR));
    if (driver_name != NULL) {
        wfl_log(stdout, "EGL driver name: %s\n", driver_name);
    }

    init_dmabuf_formats(westfield_drm);

    return true;
}

static bool egl_init(struct westfield_drm *westfield_drm, EGLenum platform,
                     void *remote_display) {
    EGLDisplay display = westfield_drm->egl.procs.eglGetPlatformDisplayEXT(platform,
                                                             remote_display, NULL);
    if (display == EGL_NO_DISPLAY) {
        wfl_log(stderr, "Failed to create EGL display");
        return false;
    }

    if (!egl_init_display(westfield_drm, display)) {
        eglTerminate(display);
        return false;
    }

    size_t atti = 0;
    EGLint attribs[5];
    attribs[atti++] = EGL_CONTEXT_CLIENT_VERSION;
    attribs[atti++] = 2;

    // Request a high priority context if possible
    // TODO: only do this if we're running as the DRM master
    bool request_high_priority = westfield_drm->egl.exts.IMG_context_priority;

    // Try to reschedule all of our rendering to be completed first. If it
    // fails, it will fallback to the default priority (MEDIUM).
    if (request_high_priority) {
        attribs[atti++] = EGL_CONTEXT_PRIORITY_LEVEL_IMG;
        attribs[atti++] = EGL_CONTEXT_PRIORITY_HIGH_IMG;
    }

    attribs[atti++] = EGL_NONE;
    assert(atti <= sizeof(attribs)/sizeof(attribs[0]));

    // hack hack remove below once we can use gstreamer 1.22 and replace this eglconfig with EGL_NO_CONFIG_KHR
    const int size = 1;
    int matching;
    const EGLint attrib_required[] = {
            EGL_SURFACE_TYPE, EGL_PBUFFER_BIT,
            EGL_RENDERABLE_TYPE, EGL_OPENGL_ES2_BIT,
            EGL_RED_SIZE, 8,
            EGL_GREEN_SIZE, 8,
            EGL_BLUE_SIZE, 8,
            EGL_ALPHA_SIZE, 8,
            EGL_NONE};
    eglChooseConfig(westfield_drm->egl.egl_display, attrib_required, &westfield_drm->egl.config, size, &matching);
    // end of hack hack
//    westfield_drm->egl.config = EGL_NO_CONFIG_KHR;

    westfield_drm->egl.context = eglCreateContext(westfield_drm->egl.egl_display, westfield_drm->egl.config,
                                    EGL_NO_CONTEXT, attribs);
    if (westfield_drm->egl.context == EGL_NO_CONTEXT) {
        wfl_log(stderr, "Failed to create EGL context");
        return false;
    }

    if (request_high_priority) {
        EGLint priority = EGL_CONTEXT_PRIORITY_MEDIUM_IMG;
        eglQueryContext(westfield_drm->egl.egl_display, westfield_drm->egl.context,
                        EGL_CONTEXT_PRIORITY_LEVEL_IMG, &priority);
        if (priority != EGL_CONTEXT_PRIORITY_HIGH_IMG) {
            wfl_log(stdout, "Failed to obtain a high priority context");
        } else {
            wfl_log(stdout, "Obtained high priority context");
        }
    }

    return true;
}

static int
open_render_node(int drm_fd) {
    char *render_name = drmGetRenderDeviceNameFromFd(drm_fd);
    if (render_name == NULL) {
        // This can happen on split render/display platforms, fallback to
        // primary node
        render_name = drmGetPrimaryDeviceNameFromFd(drm_fd);
        if (render_name == NULL) {
            wfl_log(stderr, "drmGetPrimaryDeviceNameFromFd failed");
            return -1;
        }
        wfl_log(stdout, "DRM device '%s' has no render node, "
                           "falling back to primary node\n", render_name);
    }

    int render_fd = open(render_name, O_RDWR | O_CLOEXEC);
    if (render_fd < 0) {
        wfl_log(stderr, "Failed to open DRM node '%s'\n", render_name);
    }
    free(render_name);
    return render_fd;
}

static int 
westfield_drm_egl_create_with_drm_fd(struct westfield_drm *westfield_drm, int drm_fd) {
    if (egl_create(westfield_drm)) {
        wfl_log(stderr, "Failed to create EGL context");
        return -1;
    }

    if (westfield_drm->egl.exts.EXT_platform_device) {
        /*
         * Search for the EGL device matching the DRM fd using the
         * EXT_device_enumeration extension.
         */
        EGLDeviceEXT egl_device = get_egl_device_from_drm_fd(westfield_drm, drm_fd);
        if (egl_device != EGL_NO_DEVICE_EXT) {
            if (egl_init(westfield_drm, EGL_PLATFORM_DEVICE_EXT, egl_device)) {
                wfl_log(stdout, "Using EGL_PLATFORM_DEVICE_EXT");
                return 0;
            }
            goto error;
        }
        /* Falls back on GBM in case the device was not found */
    } else {
        wfl_log(stdout, "EXT_platform_device not supported");
    }

    if (westfield_drm->egl.exts.KHR_platform_gbm) {
        int gbm_fd = open_render_node(drm_fd);
        if (gbm_fd < 0) {
            wfl_log(stderr, "Failed to open DRM render node");
            goto error;
        }

        westfield_drm->egl.gbm_device = gbm_create_device(gbm_fd);
        if (!westfield_drm->egl.gbm_device) {
            close(gbm_fd);
            wfl_log(stderr, "Failed to create GBM device");
            goto error;
        }

        if (egl_init(westfield_drm, EGL_PLATFORM_GBM_KHR, westfield_drm->egl.gbm_device)) {
            wfl_log(stdout, "Using EGL_PLATFORM_GBM_KHR");
            return 0;
        }

        gbm_device_destroy(westfield_drm->egl.gbm_device);
        close(gbm_fd);
    } else {
        wfl_log(stdout, "KHR_platform_gbm not supported");
    }

    error:
    wfl_log(stderr, "Failed to initialize EGL context");
    if (westfield_drm->egl.egl_display) {
        eglMakeCurrent(westfield_drm->egl.egl_display, EGL_NO_SURFACE, EGL_NO_SURFACE,
                       EGL_NO_CONTEXT);
        eglTerminate(westfield_drm->egl.egl_display);
    }
    eglReleaseThread();
    return -1;
}

struct westfield_drm *
westfield_drm_new(struct wl_display *wl_display) {
    struct westfield_drm *westfield_drm = calloc(sizeof (struct westfield_drm), 1);

    char *devpath = boot_gpu_devpath();
    wfl_log(stdout, "using device path %s", devpath);
    int32_t fd = open(devpath, O_RDWR|O_CLOEXEC|O_NOCTTY|O_NONBLOCK);
    assert (fd > 0);
    free(devpath);
    westfield_drm->drm_fd = fd;

    if(westfield_drm_egl_create_with_drm_fd(westfield_drm, fd)) {
        close(fd);
        goto err;
    }

   return westfield_drm;

    err:
        free(westfield_drm);
        return NULL;
}

void
westfield_drm_finalize(struct westfield_drm *westfield_drm) {
    // TODO proper cleanup
    gbm_device_destroy(westfield_drm->egl.gbm_device);
    close(westfield_drm->drm_fd);
}

EGLDisplay
westfield_drm_get_egl_display(struct westfield_drm *westfield_drm) {
    return westfield_drm->egl.egl_display;
}

EGLContext
westfield_drm_get_egl_context(struct westfield_drm *westfield_drm) {
    return westfield_drm->egl.context;
}

EGLDeviceEXT
westfield_drm_get_egl_device(struct westfield_drm *westfield_drm) {
    return westfield_drm->egl.device;
}

EGLConfig
westfield_drm_get_egl_config(struct westfield_drm *westfield_drm) {
    return westfield_drm->egl.config;
}

EGLImageKHR
westfield_drm_create_egl_image_from_dmabuf(struct westfield_drm *westfield_drm, struct dmabuf_attributes *attributes, bool *external_only) {
    if (!westfield_drm->egl.exts.KHR_image_base || !westfield_drm->egl.exts.EXT_image_dma_buf_import) {
        wfl_log(stderr, "dmabuf import extension not present");
        return NULL;
    }

    if (attributes->modifier != DRM_FORMAT_MOD_INVALID &&
        attributes->modifier != DRM_FORMAT_MOD_LINEAR &&
        !westfield_drm->egl.has_modifiers) {
        wfl_log(stderr, "EGL implementation doesn't support modifiers");
        return NULL;
    }

    unsigned int atti = 0;
    EGLint attribs[50];
    attribs[atti++] = EGL_WIDTH;
    attribs[atti++] = attributes->width;
    attribs[atti++] = EGL_HEIGHT;
    attribs[atti++] = attributes->height;
    attribs[atti++] = EGL_LINUX_DRM_FOURCC_EXT;
    attribs[atti++] = attributes->format;

    struct {
        EGLint fd;
        EGLint offset;
        EGLint pitch;
        EGLint mod_lo;
        EGLint mod_hi;
    } attr_names[WESTFIELD_DMABUF_MAX_PLANES] = {
            {
                    EGL_DMA_BUF_PLANE0_FD_EXT,
                    EGL_DMA_BUF_PLANE0_OFFSET_EXT,
                    EGL_DMA_BUF_PLANE0_PITCH_EXT,
                    EGL_DMA_BUF_PLANE0_MODIFIER_LO_EXT,
                    EGL_DMA_BUF_PLANE0_MODIFIER_HI_EXT
            }, {
                    EGL_DMA_BUF_PLANE1_FD_EXT,
                    EGL_DMA_BUF_PLANE1_OFFSET_EXT,
                    EGL_DMA_BUF_PLANE1_PITCH_EXT,
                    EGL_DMA_BUF_PLANE1_MODIFIER_LO_EXT,
                    EGL_DMA_BUF_PLANE1_MODIFIER_HI_EXT
            }, {
                    EGL_DMA_BUF_PLANE2_FD_EXT,
                    EGL_DMA_BUF_PLANE2_OFFSET_EXT,
                    EGL_DMA_BUF_PLANE2_PITCH_EXT,
                    EGL_DMA_BUF_PLANE2_MODIFIER_LO_EXT,
                    EGL_DMA_BUF_PLANE2_MODIFIER_HI_EXT
            }, {
                    EGL_DMA_BUF_PLANE3_FD_EXT,
                    EGL_DMA_BUF_PLANE3_OFFSET_EXT,
                    EGL_DMA_BUF_PLANE3_PITCH_EXT,
                    EGL_DMA_BUF_PLANE3_MODIFIER_LO_EXT,
                    EGL_DMA_BUF_PLANE3_MODIFIER_HI_EXT
            }
    };

    for (int i = 0; i < attributes->n_planes; i++) {
        attribs[atti++] = attr_names[i].fd;
        attribs[atti++] = attributes->fd[i];
        attribs[atti++] = attr_names[i].offset;
        attribs[atti++] = attributes->offset[i];
        attribs[atti++] = attr_names[i].pitch;
        attribs[atti++] = attributes->stride[i];
        if (westfield_drm->egl.has_modifiers &&
            attributes->modifier != DRM_FORMAT_MOD_INVALID) {
            attribs[atti++] = attr_names[i].mod_lo;
            attribs[atti++] = attributes->modifier & 0xFFFFFFFF;
            attribs[atti++] = attr_names[i].mod_hi;
            attribs[atti++] = attributes->modifier >> 32;
        }
    }

    // Our clients don't expect our usage to trash the buffer contents
    attribs[atti++] = EGL_IMAGE_PRESERVED_KHR;
    attribs[atti++] = EGL_TRUE;

    attribs[atti++] = EGL_NONE;
    assert(atti < sizeof(attribs)/sizeof(attribs[0]));

    EGLImageKHR image = westfield_drm->egl.procs.eglCreateImageKHR(westfield_drm->egl.egl_display, EGL_NO_CONTEXT,
                                                     EGL_LINUX_DMA_BUF_EXT, NULL, attribs);
    if (image == EGL_NO_IMAGE_KHR) {
        wfl_log(stderr, "eglCreateImageKHR failed");
        return EGL_NO_IMAGE_KHR;
    }

    *external_only = !drm_format_set_has(&westfield_drm->egl.dmabuf_render_formats,
                                             attributes->format, attributes->modifier);
    return image;
}

int
westfield_drm_get_device_fd(struct westfield_drm *westfield_drm) {
    return westfield_drm->drm_fd;
}

const struct drm_format_set*
westfield_drm_get_dmabuf_texture_formats(struct westfield_drm *westfield_drm) {
    return &westfield_drm->egl.dmabuf_texture_formats;
}