#ifndef WESTFIELD_WESTFIELD_DRM_H
#define WESTFIELD_WESTFIELD_DRM_H

#include "wayland-server-core.h"

struct westfield_drm;

struct westfield_drm*
westfield_drm_new(struct wl_display *wl_display);

void
westfield_drm_finalize(struct westfield_drm *westfield_drm);

void*
westfield_drm_get_egl_display(struct westfield_drm *westfield_drm);

void*
westfield_drm_get_egl_context(struct westfield_drm *westfield_drm);

unsigned int
westfield_drm_wl_buffer_query_egl(struct westfield_drm *westfield_drm, struct wl_resource *buffer);

#endif //WESTFIELD_WESTFIELD_DRM_H
