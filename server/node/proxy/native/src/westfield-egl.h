#ifndef WESTFIELD_WESTFIELD_EGL_H
#define WESTFIELD_WESTFIELD_EGL_H

#include <stdio.h>
#include <errno.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include "wayland-server-core.h"
#include "westfield-dmabuf.h"
#include "westfield-util.h"

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

static inline bool
drm_format_has(const struct drm_format *fmt, uint64_t modifier) {
    for (size_t i = 0; i < fmt->len; ++i) {
        if (fmt->modifiers[i] == modifier) {
            return true;
        }
    }
    return false;
}

struct westfield_egl;

struct westfield_egl*
westfield_egl_new(char* device_path);

void
westfield_egl_finalize(struct westfield_egl *westfield_egl);

EGLDisplay
westfield_egl_get_display(struct westfield_egl *westfield_egl);

EGLContext
westfield_egl_get_context(struct westfield_egl *westfield_egl);

EGLDeviceEXT
westfield_egl_get_device(struct westfield_egl *westfield_egl);

EGLConfig
westfield_egl_get_config(struct westfield_egl *westfield_egl);

int
westfield_egl_get_device_fd(struct westfield_egl *westfield_egl);

const struct drm_format_set*
westfield_egl_get_dmabuf_texture_formats(struct westfield_egl *westfield_egl);

EGLImageKHR
westfield_egl_create_image_from_dmabuf(struct westfield_egl *westfield_egl,
                                       const struct dmabuf_attributes *attributes, bool *external_only);

void
westfield_egl_destroy_image(struct westfield_egl *westfield_egl, EGLImageKHR egl_image);

#endif //WESTFIELD_WESTFIELD_EGL_H
