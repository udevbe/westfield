#ifndef WESTFIELD_WESTFIELD_DRM_H
#define WESTFIELD_WESTFIELD_DRM_H

#include <EGL/egl.h>
#include <EGL/eglext.h>
#include "wayland-server-core.h"

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

#endif //WESTFIELD_WESTFIELD_DRM_H
