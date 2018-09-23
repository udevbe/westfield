/*
 * Copyright © 2008-2011 Kristian Høgsberg
 * Copyright © 2011 Intel Corporation
 * Copyright © 2013 Jason Ekstrand
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

#ifndef WAYLAND_PRIVATE_H
#define WAYLAND_PRIVATE_H

#include <stdarg.h>
#include <stdlib.h>
#include <stdint.h>

#define WL_HIDE_DEPRECATED 1

#include "wayland-util.h"
#include "wayland-server-core.h"

/* Invalid memory address */

#define ARRAY_LENGTH(a) (sizeof (a) / sizeof (a)[0])

#define container_of(ptr, type, member) ({				\
	const __typeof__( ((type *)0)->member ) *__mptr = (ptr);	\
	(type *)( (char *)__mptr - offsetof(type,member) );})

typedef enum wl_iterator_result (*wl_iterator_func_t)(void *element,
						      void *data,
						      uint32_t flags);

struct wl_connection *
wl_connection_create(int fd);

int
wl_connection_destroy(struct wl_connection *connection);

void
wl_connection_copy(struct wl_connection *connection, void *data, size_t size);

void
wl_connection_consume(struct wl_connection *connection, size_t size);

int
wl_connection_flush(struct wl_connection *connection);

uint32_t
wl_connection_pending_input(struct wl_connection *connection);

int
wl_connection_read(struct wl_connection *connection);

int
wl_connection_write(struct wl_connection *connection,
		    const void *data, size_t count);

int
wl_connection_get_fd(struct wl_connection *connection);

extern wl_log_func_t wl_log_handler;

void wl_log(const char *fmt, ...);

struct wl_display;

static inline void *
zalloc(size_t s)
{
	return calloc(1, s);
}

struct wl_priv_signal {
	struct wl_list listener_list;
	struct wl_list emit_list;
};

void
wl_priv_signal_init(struct wl_priv_signal *signal);

void
wl_priv_signal_add(struct wl_priv_signal *signal, struct wl_listener *listener);

struct wl_listener *
wl_priv_signal_get(struct wl_priv_signal *signal, wl_notify_func_t notify);

void
wl_priv_signal_emit(struct wl_priv_signal *signal, void *data);

void
wl_priv_signal_final_emit(struct wl_priv_signal *signal, void *data);

#endif
