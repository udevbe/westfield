#ifndef WESTFIELD_WESTFIELD_DRM_H
#define WESTFIELD_WESTFIELD_DRM_H

#include <stdio.h>
#include <errno.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include "wayland-server-core.h"
#include "westfield-dmabuf.h"

#define log_errno(std, fmt, ...) \
	fprintf(std, fmt ": %s\n", ##__VA_ARGS__, strerror(errno))

/** A single DRM format, with a set of modifiers attached. */
struct drm_format {
    // The actual DRM format, from `drm_fourcc.h`
    uint32_t format;
    // The number of modifiers
    size_t len;
    // The capacity of the array; do not use.
    size_t capacity;
    // The actual modifiers
    uint64_t modifiers[];
};

/**
 * A set of DRM formats and modifiers.
 *
 * This is used to describe the supported format + modifier combinations. For
 * instance, backends will report the set they can display, and renderers will
 * report the set they can render to. For a more general overview of formats
 * and modifiers, see:
 * https://lore.kernel.org/dri-devel/20210905122742.86029-1-daniels@collabora.com/
 *
 * For compatibility with legacy drivers which don't support explicit
 * modifiers, the special modifier DRM_FORMAT_MOD_INVALID is used to indicate
 * that implicit modifiers are supported. Legacy drivers can also support the
 * DRM_FORMAT_MOD_LINEAR modifier, which forces the buffer to have a linear
 * layout.
 *
 * Users must not assume that implicit modifiers are supported unless INVALID
 * is listed in the modifier list.
 */
struct drm_format_set {
    // The number of formats
    size_t len;
    // The capacity of the array;
    size_t capacity;
    // A pointer to an array of `struct drm_format *` of length `len`.
    struct drm_format **formats;
};

static bool
drm_format_has(const struct drm_format *fmt, uint64_t modifier) {
    for (size_t i = 0; i < fmt->len; ++i) {
        if (fmt->modifiers[i] == modifier) {
            return true;
        }
    }
    return false;
}

struct westfield_drm;

struct westfield_drm*
westfield_drm_new(struct wl_display *wl_display);

void
westfield_drm_finalize(struct westfield_drm *westfield_drm);

EGLDisplay
westfield_drm_get_egl_display(struct westfield_drm *westfield_drm);

EGLContext
westfield_drm_get_egl_context(struct westfield_drm *westfield_drm);

EGLDeviceEXT
westfield_drm_get_egl_device(struct westfield_drm *westfield_drm);

EGLConfig
westfield_drm_get_egl_config(struct westfield_drm *westfield_drm);

EGLImageKHR
westfield_drm_create_egl_image_from_dmabuf(struct westfield_drm *westfield_drm, struct dmabuf_attributes *attributes, bool *external_only);

int
westfield_drm_get_device_fd(struct westfield_drm *westfield_drm);

const struct drm_format_set*
westfield_drm_get_dmabuf_texture_formats(struct westfield_drm *westfield_drm);

#endif //WESTFIELD_WESTFIELD_DRM_H
