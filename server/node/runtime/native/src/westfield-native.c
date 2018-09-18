#include <node/node_api.h>
#include <assert.h>
#include <stdlib.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdarg.h>
#include <stdbool.h>
#include <errno.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <dlfcn.h>
#include <assert.h>
#include <sys/time.h>
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <sys/epoll.h>


#define DECLARE_NAPI_METHOD(name, func)                          \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

/* This is the size of the char array in struct sock_addr_un.
 * No Wayland socket can be created with a path longer than this,
 * including the null terminator.
 */
#ifndef UNIX_PATH_MAX
#define UNIX_PATH_MAX	108
#endif

#define LOCK_SUFFIX	".lock"
#define LOCK_SUFFIXLEN	5

#if defined(__GNUC__) && __GNUC__ >= 4
#define WL_PRINTF(x, y) __attribute__((__format__(__printf__, x, y)))
#else
#define WL_PRINTF(x, y)
#endif

enum {
    WL_EVENT_READABLE = 0x01,
    WL_EVENT_WRITABLE = 0x02,
    WL_EVENT_HANGUP   = 0x04,
    WL_EVENT_ERROR    = 0x08
};

typedef int (*wl_event_loop_fd_func_t)(int fd, uint32_t mask, void *data);

struct wl_list {
    /** Previous list element */
    struct wl_list *prev;
    /** Next list element */
    struct wl_list *next;
};

struct wl_event_loop {
    int epoll_fd;
    struct wl_list check_list;
    struct wl_list idle_list;
    struct wl_list destroy_list;
};

struct wl_event_source_interface {
    int (*dispatch)(struct wl_event_source *source,
                    struct epoll_event *ep);
};

struct wl_event_source {
    struct wl_event_source_interface *interface;
    struct wl_event_loop *loop;
    struct wl_list link;
    void *data;
    int fd;
};

struct wl_event_source_fd {
    struct wl_event_source base;
    wl_event_loop_fd_func_t func;
    int fd;
};

struct wl_display {
    struct wl_event_loop *loop;
    struct wl_list socket_list;
};

struct wl_socket {
    int fd;
    int fd_lock;
    struct sockaddr_un addr;
    char lock_addr[UNIX_PATH_MAX + LOCK_SUFFIXLEN];
    struct wl_list link;
    struct wl_event_source *source;
    char *display_name;
};

static inline void *
zalloc(size_t s)
{
    return calloc(1, s);
}

static void
wl_log_stderr_handler(const char *fmt, va_list arg)
{
    vfprintf(stderr, fmt, arg);
}

typedef void (*wl_log_func_t)(const char *, va_list) WL_PRINTF(1, 0);

wl_log_func_t wl_log_handler = wl_log_stderr_handler;

void
wl_log(const char *fmt, ...)
{
    va_list argp;

    va_start(argp, fmt);
    wl_log_handler(fmt, argp);
    va_end(argp);
}

void
wl_list_init(struct wl_list *list)
{
    list->prev = list;
    list->next = list;
}

void
wl_list_remove(struct wl_list *elm)
{
    elm->prev->next = elm->next;
    elm->next->prev = elm->prev;
    elm->next = NULL;
    elm->prev = NULL;
}

void
wl_list_insert(struct wl_list *list, struct wl_list *elm)
{
    elm->prev = list;
    elm->next = list->next;
    list->next = elm;
    elm->next->prev = elm;
}

static int
set_cloexec_or_close(int fd)
{
    long flags;

    if (fd == -1)
        return -1;

    flags = fcntl(fd, F_GETFD);
    if (flags == -1)
        goto err;

    if (fcntl(fd, F_SETFD, flags | FD_CLOEXEC) == -1)
        goto err;

    return fd;

    err:
    close(fd);
    return -1;
}

int
wl_os_dupfd_cloexec(int fd, long minfd)
{
    int newfd;

    newfd = fcntl(fd, F_DUPFD_CLOEXEC, minfd);
    if (newfd >= 0)
        return newfd;
    if (errno != EINVAL)
        return -1;

    newfd = fcntl(fd, F_DUPFD, minfd);
    return set_cloexec_or_close(newfd);
}

int
wl_os_socket_cloexec(int domain, int type, int protocol)
{
    int fd;

    fd = socket(domain, type | SOCK_CLOEXEC, protocol);
    if (fd >= 0)
        return fd;
    if (errno != EINVAL)
        return -1;

    fd = socket(domain, type, protocol);
    return set_cloexec_or_close(fd);
}

int
wl_os_accept_cloexec(int sockfd, struct sockaddr *addr, socklen_t *addrlen)
{
    int fd;

#ifdef HAVE_ACCEPT4
    fd = accept4(sockfd, addr, addrlen, SOCK_CLOEXEC);
	if (fd >= 0)
		return fd;
	if (errno != ENOSYS)
		return -1;
#endif

    fd = accept(sockfd, addr, addrlen);
    return set_cloexec_or_close(fd);
}

static int
socket_data(int fd, uint32_t mask, void *data)
{
    struct wl_display *display = data;
    struct sockaddr_un name;
    socklen_t length;
    int client_fd;

    length = sizeof name;
    client_fd = wl_os_accept_cloexec(fd, (struct sockaddr *) &name,
                                     &length);
    if (client_fd < 0)
        wl_log("failed to accept: %m\n");
    else
    if (!wl_client_create(display, client_fd)) // TODO new client connected
        close(client_fd);

    return 1;
}

int
wl_event_source_remove(struct wl_event_source *source)
{
    struct wl_event_loop *loop = source->loop;

    /* We need to explicitly remove the fd, since closing the fd
     * isn't enough in case we've dup'ed the fd. */
    if (source->fd >= 0) {
        epoll_ctl(loop->epoll_fd, EPOLL_CTL_DEL, source->fd, NULL);
        close(source->fd);
        source->fd = -1;
    }

    wl_list_remove(&source->link);
    wl_list_insert(&loop->destroy_list, &source->link);

    return 0;
}

static void
wl_socket_destroy(struct wl_socket *s)
{
    if (s->source)
        wl_event_source_remove(s->source);
    if (s->addr.sun_path[0])
        unlink(s->addr.sun_path);
    if (s->fd >= 0)
        close(s->fd);
    if (s->lock_addr[0])
        unlink(s->lock_addr);
    if (s->fd_lock >= 0)
        close(s->fd_lock);

    free(s);
}

static struct wl_socket *
wl_socket_alloc(void)
{
    struct wl_socket *s;

    s = zalloc(sizeof *s);
    if (!s)
        return NULL;

    s->fd = -1;
    s->fd_lock = -1;

    return s;
}

static int
wl_socket_lock(struct wl_socket *socket)
{
    struct stat socket_stat;

    snprintf(socket->lock_addr, sizeof socket->lock_addr,
             "%s%s", socket->addr.sun_path, LOCK_SUFFIX);

    socket->fd_lock = open(socket->lock_addr, O_CREAT | O_CLOEXEC,
                           (S_IRUSR | S_IWUSR | S_IRGRP | S_IWGRP));

    if (socket->fd_lock < 0) {
        wl_log("unable to open lockfile %s check permissions\n",
               socket->lock_addr);
        goto err;
    }

    if (flock(socket->fd_lock, LOCK_EX | LOCK_NB) < 0) {
        wl_log("unable to lock lockfile %s, maybe another compositor is running\n",
               socket->lock_addr);
        goto err_fd;
    }

    if (stat(socket->addr.sun_path, &socket_stat) < 0 ) {
        if (errno != ENOENT) {
            wl_log("did not manage to stat file %s\n",
                   socket->addr.sun_path);
            goto err_fd;
        }
    } else if (socket_stat.st_mode & S_IWUSR ||
               socket_stat.st_mode & S_IWGRP) {
        unlink(socket->addr.sun_path);
    }

    return 0;
    err_fd:
    close(socket->fd_lock);
    socket->fd_lock = -1;
    err:
    *socket->lock_addr = 0;
    /* we did not set this value here, but without lock the
     * socket won't be created anyway. This prevents the
     * wl_socket_destroy from unlinking already existing socket
     * created by other compositor */
    *socket->addr.sun_path = 0;

    return -1;
}

static struct wl_event_source *
add_source(struct wl_event_loop *loop,
           struct wl_event_source *source, uint32_t mask, void *data)
{
    struct epoll_event ep;

    if (source->fd < 0) {
        free(source);
        return NULL;
    }

    source->loop = loop;
    source->data = data;
    wl_list_init(&source->link);

    memset(&ep, 0, sizeof ep);
    if (mask & WL_EVENT_READABLE)
        ep.events |= EPOLLIN;
    if (mask & WL_EVENT_WRITABLE)
        ep.events |= EPOLLOUT;
    ep.data.ptr = source;

    if (epoll_ctl(loop->epoll_fd, EPOLL_CTL_ADD, source->fd, &ep) < 0) {
        close(source->fd);
        free(source);
        return NULL;
    }

    return source;
}

static int
wl_event_source_fd_dispatch(struct wl_event_source *source,
                            struct epoll_event *ep)
{
    struct wl_event_source_fd *fd_source = (struct wl_event_source_fd *) source;
    uint32_t mask;

    mask = 0;
    if (ep->events & EPOLLIN)
        mask |= WL_EVENT_READABLE;
    if (ep->events & EPOLLOUT)
        mask |= WL_EVENT_WRITABLE;
    if (ep->events & EPOLLHUP)
        mask |= WL_EVENT_HANGUP;
    if (ep->events & EPOLLERR)
        mask |= WL_EVENT_ERROR;

    return fd_source->func(fd_source->fd, mask, source->data);
}

struct wl_event_source_interface fd_source_interface = {
        wl_event_source_fd_dispatch,
};

struct wl_event_source *
wl_event_loop_add_fd(struct wl_event_loop *loop,
                     int fd, uint32_t mask,
                     wl_event_loop_fd_func_t func,
                     void *data)
{
    struct wl_event_source_fd *source;

    source = malloc(sizeof *source);
    if (source == NULL)
        return NULL;

    source->base.interface = &fd_source_interface;
    source->base.fd = wl_os_dupfd_cloexec(fd, 0);
    source->func = func;
    source->fd = fd;

    return add_source(loop, &source->base, mask, data);
}

static int
_wl_display_add_socket(struct wl_display *display, struct wl_socket *s)
{
    socklen_t size;

    s->fd = wl_os_socket_cloexec(PF_LOCAL, SOCK_STREAM, 0);
    if (s->fd < 0) {
        return -1;
    }

    size = (socklen_t) (offsetof (struct sockaddr_un, sun_path) + strlen(s->addr.sun_path));
    if (bind(s->fd, (struct sockaddr *) &s->addr, size) < 0) {
        wl_log("bind() failed with error: %m\n");
        return -1;
    }

    if (listen(s->fd, 128) < 0) {
        wl_log("listen() failed with error: %m\n");
        return -1;
    }

    s->source = wl_event_loop_add_fd(display->loop, s->fd,
                                     WL_EVENT_READABLE,
                                     socket_data, display);
    if (s->source == NULL) {
        return -1;
    }

    wl_list_insert(display->socket_list.prev, &s->link);
    return 0;
}

static int
wl_socket_init_for_display_name(struct wl_socket *s, const char *name)
{
    int name_size;
    const char *runtime_dir;

    runtime_dir = getenv("XDG_RUNTIME_DIR");
    if (!runtime_dir) {
        wl_log("error: XDG_RUNTIME_DIR not set in the environment\n");

        /* to prevent programs reporting
         * "failed to add socket: Success" */
        errno = ENOENT;
        return -1;
    }

    s->addr.sun_family = AF_LOCAL;
    name_size = snprintf(s->addr.sun_path, sizeof s->addr.sun_path,
                         "%s/%s", runtime_dir, name) + 1;

    s->display_name = (s->addr.sun_path + name_size - 1) - strlen(name);

    assert(name_size > 0);
    if (name_size > (int)sizeof s->addr.sun_path) {
        wl_log("error: socket path \"%s/%s\" plus null terminator"
               " exceeds 108 bytes\n", runtime_dir, name);
        *s->addr.sun_path = 0;
        /* to prevent programs reporting
         * "failed to add socket: Success" */
        errno = ENAMETOOLONG;
        return -1;
    }

    return 0;
}

const char *
wl_display_add_socket_auto(struct wl_display *display)
{
    struct wl_socket *s;
    int displayno = 0;
    char display_name[16] = "";

    /* A reasonable number of maximum default sockets. If
     * you need more than this, use the explicit add_socket API. */
    const int MAX_DISPLAYNO = 32;

    s = wl_socket_alloc();
    if (s == NULL)
        return NULL;

    do {
        snprintf(display_name, sizeof display_name, "wayland-%d", displayno);
        if (wl_socket_init_for_display_name(s, display_name) < 0) {
            wl_socket_destroy(s);
            return NULL;
        }

        if (wl_socket_lock(s) < 0)
            continue;

        if (_wl_display_add_socket(display, s) < 0) {
            wl_socket_destroy(s);
            return NULL;
        }

        return s->display_name;
    } while (displayno++ < MAX_DISPLAYNO);

    /* Ran out of display names. */
    wl_socket_destroy(s);
    errno = EINVAL;
    return NULL;
}

napi_value
addSocketAuto(napi_env env, napi_callback_info info) {
    struct wl_display *display = malloc(sizeof(struct wl_display));
    wl_display_add_socket_auto(display);
}


napi_value
init(napi_env env, napi_value exports) {
    napi_property_descriptor desc = DECLARE_NAPI_METHOD("addSocketAuto", addSocketAuto);
    napi_status status;
    status = napi_define_properties(env, exports, 1, &desc);
    assert(status == napi_ok);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)