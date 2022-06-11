#ifndef WESTFIELD_WESTFIELD_LINUX_DMABUF_V1_H
#define WESTFIELD_WESTFIELD_LINUX_DMABUF_V1_H

#include "westfield-buffer.h"
#include "westfield-drm.h"

struct westfield_dmabuf_v1_buffer {
    struct westfield_buffer base;

    struct wl_resource *resource; // can be NULL if the client destroyed it
    struct dmabuf_attributes attributes;

    // private state

    struct wl_listener release;
};

struct westfield_linux_dmabuf_v1 *
westfield_linux_dmabuf_v1_create(struct wl_display *display, struct westfield_drm *renderer);

bool
westfield_dmabuf_v1_resource_is_buffer(struct wl_resource *resource);

struct westfield_dmabuf_v1_buffer *
westfield_dmabuf_v1_buffer_from_buffer_resource(struct wl_resource *resource);

#endif //WESTFIELD_WESTFIELD_LINUX_DMABUF_V1_H
