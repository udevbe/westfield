/*
 * Copyright © 2018 Erik De Rijcke
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice (including the
 * next paragraph) shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT.  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

#include "wayland-server/wayland-server.h"
#include "connection.h"

struct wl_connection *
wl_client_get_connection(struct wl_client *client);

typedef int (*wl_connection_wire_message_t)(struct wl_client *client, int32_t *wire_message,
                                            size_t wire_message_size, int object_id, int opcode);

void
wl_client_set_wire_message_cb(struct wl_client *client, wl_connection_wire_message_t wire_message_cb);

typedef void (*wl_connection_wire_message_end_t) (struct wl_client *client, int *fds_in, size_t fds_in_size);

void
wl_client_set_wire_message_end_cb(struct wl_client *client, wl_connection_wire_message_end_t wire_message_end_cb);

typedef void (*wl_registry_created_t)(struct wl_client *client, struct wl_resource *registry, uint32_t registry_id);

void
wl_client_set_registry_created_cb(struct wl_client *client, wl_registry_created_t registry_created_cb);

void
wl_registry_emit_globals(struct wl_resource *registry_resource);

typedef void (*wl_global_cb_t)(struct wl_display *display, uint32_t name);

void
wl_display_set_global_created_cb(struct wl_display *display, wl_global_cb_t global_created_cb);

void
wl_display_set_global_destroyed_cb(struct wl_display *display, wl_global_cb_t global_destroyed_cb);

void
wl_resource_destroy_silently(struct wl_resource *resource);
