#ifndef WESTFIELD_WESTFIELD_DRM_H
#define WESTFIELD_WESTFIELD_DRM_H

#include "wayland-server-core.h"
#include "westfield-egl.h"
#include "westfield-buffer.h"
#include "westfield-dmabuf.h"

struct westfield_drm_buffer {
    struct westfield_buffer base;

    struct wl_resource *resource; // can be NULL if the client destroyed it
    struct dmabuf_attributes dmabuf;

    struct wl_listener release;
};

/**
 * A stub implementation of Mesa's wl_drm protocol.
 *
 * It only implements the minimum necessary for modern clients to behave
 * properly. In particular, flink handles are left unimplemented.
 */
struct westfield_drm {
    struct wl_global *global;
    struct westfield_egl *westfield_egl;
    char *node_name;

    struct {
        struct wl_signal destroy;
    } events;

//    struct wl_listener display_destroy;
//    struct wl_listener renderer_destroy;
};

bool
westfield_drm_buffer_is_resource(struct wl_resource *resource);

struct westfield_drm_buffer *
westfield_drm_buffer_from_resource(struct wl_resource *resource);

struct westfield_drm *
westfield_drm_create(struct wl_display *display, struct westfield_egl *westfield_egl);

#endif //WESTFIELD_WESTFIELD_DRM_H
