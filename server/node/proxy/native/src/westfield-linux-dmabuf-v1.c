#include <unistd.h>
#include <assert.h>
#include <malloc.h>
#include <sys/mman.h>
#include <string.h>
#include <sys/stat.h>
#include <drm/drm_fourcc.h>
#include <fcntl.h>
#include <time.h>
#include <sys/sysmacros.h>
#include <libudev.h>
#include <xf86drm.h>
#include "linux-dmabuf-unstable-v1-protocol.h"
#include "westfield-surface.h"
#include "westfield-egl.h"
#include "westfield-linux-dmabuf-v1.h"
#include "addon.h"
#include "westfield-util.h"

#define LINUX_DMABUF_VERSION 4

#define RANDNAME_PATTERN "/westfield-XXXXXX"

static void
randname(char *buf) {
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    long r = ts.tv_nsec;
    for (int i = 0; i < 6; ++i) {
        buf[i] = 'A'+(r&15)+(r&16)*2;
        r >>= 5;
    }
}

static int
excl_shm_open(char *name) {
    int retries = 100;
    do {
        randname(name + strlen(RANDNAME_PATTERN) - 6);

        --retries;
        // CLOEXEC is guaranteed to be set by shm_open
        int fd = shm_open(name, O_RDWR | O_CREAT | O_EXCL, 0600);
        if (fd >= 0) {
            return fd;
        }
    } while (retries > 0 && errno == EEXIST);

    return -1;
}

bool
allocate_shm_file_pair(size_t size, int *rw_fd_ptr, int *ro_fd_ptr) {
    char name[] = RANDNAME_PATTERN;
    int rw_fd = excl_shm_open(name);
    if (rw_fd < 0) {
        return false;
    }

    // CLOEXEC is guaranteed to be set by shm_open
    int ro_fd = shm_open(name, O_RDONLY, 0);
    if (ro_fd < 0) {
        shm_unlink(name);
        close(rw_fd);
        return false;
    }

    shm_unlink(name);

    // Make sure the file cannot be re-opened in read-write mode (e.g. via
    // "/proc/self/fd/" on Linux)
    if (fchmod(rw_fd, 0) != 0) {
        close(rw_fd);
        close(ro_fd);
        return false;
    }

    int ret;
    do {
        ret = ftruncate(rw_fd, (off_t)size);
    } while (ret < 0 && errno == EINTR);
    if (ret < 0) {
        close(rw_fd);
        close(ro_fd);
        return false;
    }

    *rw_fd_ptr = rw_fd;
    *ro_fd_ptr = ro_fd;
    return true;
}

struct westfield_linux_dmabuf_feedback_v1_compiled_tranche {
    dev_t target_device;
    uint32_t flags; // bitfield of enum zwp_linux_dmabuf_feedback_v1_tranche_flags
    struct wl_array indices; // uint16_t
};

struct westfield_linux_dmabuf_feedback_v1_compiled {
    dev_t main_device;
    int table_fd;
    size_t table_size;

    size_t tranches_len;
    struct westfield_linux_dmabuf_feedback_v1_compiled_tranche tranches[];
};

struct westfield_linux_dmabuf_feedback_v1_table_entry {
    uint32_t format;
    uint32_t pad; // unused
    uint64_t modifier;
};

/* the protocol interface */
struct westfield_linux_dmabuf_v1 {
    struct wl_global *global;
    struct westfield_egl *renderer;

    struct {
        struct wl_signal destroy;
    } events;

    // private state

    struct westfield_linux_dmabuf_feedback_v1_compiled *default_feedback;
    struct wl_list surfaces; // westfield_linux_dmabuf_v1_surface.link

    // TODO implement these?
//    struct wl_listener display_destroy;
//    struct wl_listener renderer_destroy;
};

struct westfield_linux_buffer_params_v1 {
    struct wl_resource *resource;
    struct westfield_linux_dmabuf_v1 *linux_dmabuf;
    struct dmabuf_attributes attributes;
    bool has_modifier;
};

struct westfield_linux_dmabuf_feedback_v1_tranche {
    dev_t target_device;
    uint32_t flags; // bitfield of enum zwp_linux_dmabuf_feedback_v1_tranche_flags
    const struct drm_format_set *formats;
};

struct westfield_linux_dmabuf_feedback_v1 {
    dev_t main_device;
    size_t tranches_len;
    const struct westfield_linux_dmabuf_feedback_v1_tranche *tranches;
};

static void buffer_handle_release(struct wl_listener *listener, void *data) {
    struct westfield_dmabuf_v1_buffer *buffer =
            wl_container_of(listener, buffer, release);
    if (buffer->resource != NULL) {
        wl_buffer_send_release(buffer->resource);
    }
}

static const struct zwp_linux_buffer_params_v1_interface buffer_params_impl;

static struct westfield_linux_buffer_params_v1 *params_from_resource(
        struct wl_resource *resource) {
    assert(wl_resource_instance_of(resource,
                                   &zwp_linux_buffer_params_v1_interface, &buffer_params_impl));
    return wl_resource_get_user_data(resource);
}

static void params_destroy(struct wl_client *client,
                           struct wl_resource *resource) {
    wl_resource_destroy(resource);
}

static void
params_add(struct wl_client *client,
           struct wl_resource *params_resource,
           int32_t fd,
           uint32_t plane_idx,
           uint32_t offset,
           uint32_t stride,
           uint32_t modifier_hi,
           uint32_t modifier_lo) {
    struct westfield_linux_buffer_params_v1 *params =
            params_from_resource(params_resource);
    if (!params) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_ALREADY_USED,
                               "params was already used to create a wl_buffer");
        close(fd);
        return;
    }

    if (plane_idx >= WESTFIELD_DMABUF_MAX_PLANES) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_PLANE_IDX,
                               "plane index %u > %u", plane_idx, WESTFIELD_DMABUF_MAX_PLANES);
        close(fd);
        return;
    }

    if (params->attributes.fd[plane_idx] != -1) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_PLANE_SET,
                               "a dmabuf with FD %d has already been added for plane %u",
                               params->attributes.fd[plane_idx], plane_idx);
        close(fd);
        return;
    }

    uint64_t modifier = ((uint64_t)modifier_hi << 32) | modifier_lo;
    if (params->has_modifier && modifier != params->attributes.modifier) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_INVALID_FORMAT,
                               "sent modifier %" PRIu64 " for plane %u, expected"
                                                        " modifier %" PRIu64 " like other planes",
                modifier, plane_idx, params->attributes.modifier);
        close(fd);
        return;
    }

    params->attributes.modifier = modifier;
    params->has_modifier = true;

    params->attributes.fd[plane_idx] = fd;
    params->attributes.offset[plane_idx] = offset;
    params->attributes.stride[plane_idx] = stride;
    params->attributes.n_planes++;
}

static void
buffer_handle_resource_destroy(struct wl_resource *buffer_resource) {
    struct westfield_dmabuf_v1_buffer *buffer =
            westfield_dmabuf_v1_buffer_from_buffer_resource(buffer_resource);
    buffer->resource = NULL;
    westfield_buffer_drop(&buffer->base);
}

static void buffer_handle_destroy(struct wl_client *client,
                                  struct wl_resource *resource) {
    wl_resource_destroy(resource);
}

static const struct wl_buffer_interface wl_buffer_impl = {
        .destroy = buffer_handle_destroy,
};

bool
westfield_dmabuf_v1_resource_is_buffer(struct wl_resource *resource) {
    if (!wl_resource_instance_of(resource, &wl_buffer_interface,
                                 &wl_buffer_impl)) {
        return false;
    }
    return wl_resource_get_user_data(resource) != NULL;
}

struct westfield_dmabuf_v1_buffer *
westfield_dmabuf_v1_buffer_from_buffer_resource(struct wl_resource *resource) {
    assert(wl_resource_instance_of(resource, &wl_buffer_interface, &wl_buffer_impl));
    return wl_resource_get_user_data(resource);
}

static const struct westfield_buffer_impl buffer_impl;

static struct westfield_dmabuf_v1_buffer *
dmabuf_v1_buffer_from_buffer(struct westfield_buffer *buffer) {
    assert(buffer->impl == &buffer_impl);
    return (struct westfield_dmabuf_v1_buffer *)buffer;
}

static void
buffer_destroy(struct westfield_buffer *wlr_buffer) {
    struct westfield_dmabuf_v1_buffer *buffer =
            dmabuf_v1_buffer_from_buffer(wlr_buffer);
    if (buffer->resource != NULL) {
        wl_resource_set_user_data(buffer->resource, NULL);
    }
    dmabuf_attributes_finish(&buffer->attributes);
    wl_list_remove(&buffer->release.link);
    free(buffer);
}

static bool
buffer_get_dmabuf(struct westfield_buffer *westfield_buffer, struct dmabuf_attributes *attribs) {
    struct westfield_dmabuf_v1_buffer *buffer =
            dmabuf_v1_buffer_from_buffer(westfield_buffer);
    memcpy(attribs, &buffer->attributes, sizeof(buffer->attributes));
    return true;
}

static const struct westfield_buffer_impl buffer_impl = {
        .destroy = buffer_destroy,
        .get_dmabuf = buffer_get_dmabuf,
};

static void
params_create_common(struct wl_resource *params_resource,
                             uint32_t buffer_id, int32_t width, int32_t height, uint32_t format,
                             uint32_t flags) {
    struct westfield_linux_buffer_params_v1 *params =
            params_from_resource(params_resource);
    if (!params) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_ALREADY_USED,
                               "params was already used to create a wl_buffer");
        return;
    }

    struct dmabuf_attributes attribs = params->attributes;
    struct westfield_linux_dmabuf_v1 *linux_dmabuf = params->linux_dmabuf;

    // Make the params resource inert
    wl_resource_set_user_data(params_resource, NULL);
    free(params);

    if (!attribs.n_planes) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_INCOMPLETE,
                               "no dmabuf has been added to the params");
        goto err_out;
    }

    if (attribs.fd[0] == -1) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_INCOMPLETE,
                               "no dmabuf has been added for plane 0");
        goto err_out;
    }

    if ((attribs.fd[3] >= 0 || attribs.fd[2] >= 0) &&
        (attribs.fd[2] == -1 || attribs.fd[1] == -1)) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_INCOMPLETE,
                               "gap in dmabuf planes");
        goto err_out;
    }

    /* reject unknown flags */
    uint32_t all_flags = ZWP_LINUX_BUFFER_PARAMS_V1_FLAGS_Y_INVERT |
                         ZWP_LINUX_BUFFER_PARAMS_V1_FLAGS_INTERLACED |
                         ZWP_LINUX_BUFFER_PARAMS_V1_FLAGS_BOTTOM_FIRST;
    if (flags & ~all_flags) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_INVALID_FORMAT,
                               "Unknown dmabuf flags %"PRIu32, flags);
        goto err_out;
    }

    if (flags != 0) {
        fprintf(stderr, "dmabuf flags aren't supported");
        goto err_failed;
    }

    attribs.width = width;
    attribs.height = height;
    attribs.format = format;

    if (width < 1 || height < 1) {
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_INVALID_DIMENSIONS,
                               "invalid width %d or height %d", width, height);
        goto err_out;
    }

    for (int i = 0; i < attribs.n_planes; i++) {
        if ((uint64_t)attribs.offset[i]
            + attribs.stride[i] > UINT32_MAX) {
            wl_resource_post_error(params_resource,
                                   ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_OUT_OF_BOUNDS,
                                   "size overflow for plane %d", i);
            goto err_out;
        }

        if ((uint64_t)attribs.offset[i]
            + (uint64_t)attribs.stride[i] * height > UINT32_MAX) {
            wl_resource_post_error(params_resource,
                                   ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_OUT_OF_BOUNDS,
                                   "size overflow for plane %d", i);
            goto err_out;
        }

        off_t size = lseek(attribs.fd[i], 0, SEEK_END);
        if (size == -1) {
            // Skip checks if kernel does no support seek on buffer
            continue;
        }
        if (attribs.offset[i] > size) {
            wl_resource_post_error(params_resource,
                                   ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_OUT_OF_BOUNDS,
                                   "invalid offset %" PRIu32 " for plane %d",
                    attribs.offset[i], i);
            goto err_out;
        }

        if (attribs.offset[i] + attribs.stride[i] > size ||
            attribs.stride[i] == 0) {
            wl_resource_post_error(params_resource,
                                   ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_OUT_OF_BOUNDS,
                                   "invalid stride %" PRIu32 " for plane %d",
                    attribs.stride[i], i);
            goto err_out;
        }

        // planes > 0 might be subsampled according to fourcc format
        if (i == 0 && attribs.offset[i] +
                      attribs.stride[i] * height > size) {
            wl_resource_post_error(params_resource,
                                   ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_OUT_OF_BOUNDS,
                                   "invalid buffer stride or height for plane %d", i);
            goto err_out;
        }
    }

    struct westfield_dmabuf_v1_buffer *buffer = calloc(1, sizeof(*buffer));
    if (!buffer) {
        wl_resource_post_no_memory(params_resource);
        goto err_failed;
    }
    westfield_buffer_init(&buffer->base, &buffer_impl, attribs.width, attribs.height);

    struct wl_client *client = wl_resource_get_client(params_resource);
    buffer->resource = wl_resource_create(client, &wl_buffer_interface,
                                          1, buffer_id);
    if (!buffer->resource) {
        wl_resource_post_no_memory(params_resource);
        free(buffer);
        goto err_failed;
    }
    wl_resource_set_implementation(buffer->resource,
                                   &wl_buffer_impl, buffer, buffer_handle_resource_destroy);

    buffer->attributes = attribs;

    buffer->release.notify = buffer_handle_release;
    wl_signal_add(&buffer->base.events.release, &buffer->release);

    /* send 'created' event when the request is not for an immediate
     * import, that is buffer_id is zero */
    if (buffer_id == 0) {
        zwp_linux_buffer_params_v1_send_created(params_resource,
                                                buffer->resource);
    }

    return;

    err_failed:
    if (buffer_id == 0) {
        zwp_linux_buffer_params_v1_send_failed(params_resource);
    } else {
        /* since the behavior is left implementation defined by the
         * protocol in case of create_immed failure due to an unknown cause,
         * we choose to treat it as a fatal error and immediately kill the
         * client instead of creating an invalid handle and waiting for it
         * to be used.
         */
        wl_resource_post_error(params_resource,
                               ZWP_LINUX_BUFFER_PARAMS_V1_ERROR_INVALID_WL_BUFFER,
                               "importing the supplied dmabufs failed");
    }
    err_out:
    dmabuf_attributes_finish(&attribs);
}

static void params_create(struct wl_client *client,
                          struct wl_resource *params_resource,
                          int32_t width, int32_t height, uint32_t format, uint32_t flags) {
    params_create_common(params_resource, 0, width, height, format,
                         flags);
}

static void
params_create_immed(struct wl_client *client,
                    struct wl_resource *params_resource, uint32_t buffer_id,
                    int32_t width, int32_t height, uint32_t format, uint32_t flags) {
    params_create_common(params_resource, buffer_id, width, height,
                         format, flags);
}

static const struct zwp_linux_buffer_params_v1_interface buffer_params_impl = {
        .destroy = params_destroy,
        .add = params_add,
        .create = params_create,
        .create_immed = params_create_immed,
};

static void params_handle_resource_destroy(struct wl_resource *resource) {
    struct westfield_linux_buffer_params_v1 *params = params_from_resource(resource);
    if (!params) {
        return;
    }
    dmabuf_attributes_finish(&params->attributes);
    free(params);
}

static const struct zwp_linux_dmabuf_v1_interface linux_dmabuf_impl;

static struct westfield_linux_dmabuf_v1 *
linux_dmabuf_from_resource(struct wl_resource *resource) {
    assert(wl_resource_instance_of(resource, &zwp_linux_dmabuf_v1_interface,
                                   &linux_dmabuf_impl));

    struct westfield_linux_dmabuf_v1 *dmabuf = wl_resource_get_user_data(resource);
    assert(dmabuf);
    return dmabuf;
}

struct westfield_linux_dmabuf_v1_surface {
    struct westfield_surface *surface;
    struct westfield_linux_dmabuf_v1 *linux_dmabuf;
    struct wl_list link; // westfield_linux_dmabuf_v1.surfaces

    struct addon addon;
    struct westfield_linux_dmabuf_feedback_v1_compiled *feedback;

    struct wl_list feedback_resources; // wl_resource_get_link
};

static void
linux_dmabuf_create_params(struct wl_client *client, struct wl_resource *linux_dmabuf_resource, uint32_t params_id) {
    struct westfield_linux_dmabuf_v1 *linux_dmabuf =
            linux_dmabuf_from_resource(linux_dmabuf_resource);

    struct westfield_linux_buffer_params_v1 *params = calloc(1, sizeof(*params));
    if (!params) {
        wl_resource_post_no_memory(linux_dmabuf_resource);
        return;
    }

    for (int i = 0; i < WESTFIELD_DMABUF_MAX_PLANES; i++) {
        params->attributes.fd[i] = -1;
    }

    params->linux_dmabuf = linux_dmabuf;

    int version = wl_resource_get_version(linux_dmabuf_resource);
    params->resource = wl_resource_create(client,
                                          &zwp_linux_buffer_params_v1_interface, version, params_id);
    if (!params->resource) {
        free(params);
        wl_resource_post_no_memory(linux_dmabuf_resource);
        return;
    }
    wl_resource_set_implementation(params->resource,
                                   &buffer_params_impl, params, params_handle_resource_destroy);
}

static void
linux_dmabuf_feedback_destroy(struct wl_client *client, struct wl_resource *resource) {
    wl_resource_destroy(resource);
}

static const struct zwp_linux_dmabuf_feedback_v1_interface
        linux_dmabuf_feedback_impl = {
        .destroy = linux_dmabuf_feedback_destroy,
};

static ssize_t
get_drm_format_set_index(const struct drm_format_set *set, uint32_t format, uint64_t modifier) {
    bool format_found = false;
    const struct drm_format *fmt;
    size_t idx = 0;
    for (size_t i = 0; i < set->len; i++) {
        fmt = set->formats[i];
        if (fmt->format == format) {
            format_found = true;
            break;
        }
        idx += fmt->len;
    }
    if (!format_found) {
        return -1;
    }

    for (size_t i = 0; i < fmt->len; i++) {
        if (fmt->modifiers[i] == modifier) {
            return (ssize_t)idx;
        }
        idx++;
    }
    return -1;
}

static struct westfield_linux_dmabuf_feedback_v1_compiled *
feedback_compile(const struct westfield_linux_dmabuf_feedback_v1 *feedback) {
    assert(feedback->tranches_len > 0);

    // Require the last tranche to be the fallback tranche and contain all
    // formats/modifiers
    const struct westfield_linux_dmabuf_feedback_v1_tranche *fallback_tranche =
            &feedback->tranches[feedback->tranches_len - 1];

    size_t table_len = 0;
    for (size_t i = 0; i < fallback_tranche->formats->len; i++) {
        const struct drm_format *fmt = fallback_tranche->formats->formats[i];
        table_len += fmt->len;
    }
    assert(table_len > 0);

    size_t table_size =
            table_len * sizeof(struct westfield_linux_dmabuf_feedback_v1_table_entry);
    int rw_fd, ro_fd;
    if (!allocate_shm_file_pair(table_size, &rw_fd, &ro_fd)) {
        fprintf(stderr, "Failed to allocate shm file for format table");
        return NULL;
    }

    struct westfield_linux_dmabuf_feedback_v1_table_entry *table =
            mmap(NULL, table_size, PROT_READ | PROT_WRITE, MAP_SHARED, rw_fd, 0);
    if (table == MAP_FAILED) {
        wfl_log_errno(stderr, "mmap failed");
        close(rw_fd);
        close(ro_fd);
        return NULL;
    }

    close(rw_fd);

    size_t n = 0;
    for (size_t i = 0; i < fallback_tranche->formats->len; i++) {
        const struct drm_format *fmt = fallback_tranche->formats->formats[i];

        for (size_t k = 0; k < fmt->len; k++) {
            table[n] = (struct westfield_linux_dmabuf_feedback_v1_table_entry){
                    .format = fmt->format,
                    .modifier = fmt->modifiers[k],
            };
            n++;
        }
    }
    assert(n == table_len);

    munmap(table, table_size);

    struct westfield_linux_dmabuf_feedback_v1_compiled *compiled = calloc(1,
                                                                          sizeof(struct westfield_linux_dmabuf_feedback_v1_compiled) +
                                                                          feedback->tranches_len * sizeof(struct westfield_linux_dmabuf_feedback_v1_compiled_tranche));
    if (compiled == NULL) {
        close(ro_fd);
        return NULL;
    }

    compiled->main_device = feedback->main_device;
    compiled->tranches_len = feedback->tranches_len;
    compiled->table_fd = ro_fd;
    compiled->table_size = table_size;

    // Build the indices lists for all but the last (fallback) tranches
    for (size_t i = 0; i < feedback->tranches_len - 1; i++) {
        const struct westfield_linux_dmabuf_feedback_v1_tranche *tranche =
                &feedback->tranches[i];
        struct westfield_linux_dmabuf_feedback_v1_compiled_tranche *compiled_tranche =
                &compiled->tranches[i];

        compiled_tranche->target_device = tranche->target_device;
        compiled_tranche->flags = tranche->flags;

        wl_array_init(&compiled_tranche->indices);
        if (!wl_array_add(&compiled_tranche->indices, table_len * sizeof(uint16_t))) {
            fprintf(stderr, "Failed to allocate tranche indices array");
            goto error_compiled;
        }

        n = 0;
        uint16_t *indices = compiled_tranche->indices.data;
        for (size_t j = 0; j < tranche->formats->len; j++) {
            const struct drm_format *fmt = tranche->formats->formats[j];
            for (size_t k = 0; k < fmt->len; k++) {
                ssize_t index = get_drm_format_set_index(
                        fallback_tranche->formats, fmt->format, fmt->modifiers[k]);
                if (index < 0) {
                    fprintf(stderr, "Format 0x%" PRIX32 " and modifier "
                                                        "0x%" PRIX64 " are in tranche #%zu but are missing "
                                                                     "from the fallback tranche",
                            fmt->format, fmt->modifiers[k], i);
                    goto error_compiled;
                }
                indices[n] = index;
                n++;
            }
        }
        compiled_tranche->indices.size = n * sizeof(uint16_t);
    }

    struct westfield_linux_dmabuf_feedback_v1_compiled_tranche *fallback_compiled_tranche =
            &compiled->tranches[compiled->tranches_len - 1];
    fallback_compiled_tranche->target_device = fallback_tranche->target_device;
    fallback_compiled_tranche->flags = fallback_tranche->flags;

    // Build the indices list for the last (fallback) tranche
    wl_array_init(&fallback_compiled_tranche->indices);
    if (!wl_array_add(&fallback_compiled_tranche->indices,
                      table_len * sizeof(uint16_t))) {
        fprintf(stderr, "Failed to allocate fallback tranche indices array");
        goto error_compiled;
    }

    n = 0;
    uint16_t *index_ptr;
    wl_array_for_each(index_ptr, &fallback_compiled_tranche->indices) {
        *index_ptr = n;
        n++;
    }

    return compiled;

    error_compiled:
    close(compiled->table_fd);
    free(compiled);
    return NULL;
}

static void
compiled_feedback_destroy(struct westfield_linux_dmabuf_feedback_v1_compiled *feedback) {
    if (feedback == NULL) {
        return;
    }
    for (size_t i = 0; i < feedback->tranches_len; i++) {
        wl_array_release(&feedback->tranches[i].indices);
    }
    close(feedback->table_fd);
    free(feedback);
}

static bool
feedback_tranche_init_with_renderer(
        struct westfield_linux_dmabuf_feedback_v1_tranche *tranche,
        struct westfield_egl *renderer) {
    memset(tranche, 0, sizeof(*tranche));

    int drm_fd = westfield_egl_get_device_fd(renderer);
    if (drm_fd < 0) {
        wfl_log(stderr, "Failed to get DRM FD from renderer");
        return false;
    }

    struct stat stat;
    if (fstat(drm_fd, &stat) != 0) {
        wfl_log_errno(stderr, "fstat failed");
        return false;
    }
    wfl_log(stdout, "using target device: %u:%u", major(stat.st_rdev), minor(stat.st_rdev));
    tranche->target_device = stat.st_rdev;

    tranche->formats = westfield_egl_get_dmabuf_texture_formats(renderer);
    if (tranche->formats == NULL) {
        wfl_log(stderr, "Failed to get renderer DMA-BUF texture formats");
        return false;
    }

    return true;
}

static struct westfield_linux_dmabuf_feedback_v1_compiled *
compile_default_feedback(struct westfield_egl *renderer) {
    struct westfield_linux_dmabuf_feedback_v1_tranche tranche = {0};
    if (!feedback_tranche_init_with_renderer(&tranche, renderer)) {
        return NULL;
    }

    const struct westfield_linux_dmabuf_feedback_v1 feedback = {
            .main_device = tranche.target_device,
            .tranches = &tranche,
            .tranches_len = 1,
    };

    return feedback_compile(&feedback);
}

static char *
get_most_appropriate_node(const char *drm_node)
{
    drmDevice **devices;
    drmDevice *match = NULL;
    char *appropriate_node = NULL;
    int num_devices;
    int i, j;

    num_devices = drmGetDevices2(0, NULL, 0);
    assert(num_devices > 0 && "error: no drm devices available");

    devices = calloc(num_devices, sizeof(*devices));
    assert(devices && "error: failed to allocate memory for drm devices");

    num_devices = drmGetDevices2(0, devices, num_devices);
    assert(num_devices > 0 && "error: no drm devices available");

    for (i = 0; i < num_devices && match == NULL; i++) {
        for (j = 0; j < DRM_NODE_MAX && match == NULL; j++) {
            if (!(devices[i]->available_nodes & (1 << j)))
                continue;
            if (strcmp(devices[i]->nodes[j], drm_node) == 0)
                match = devices[i];
        }
    }
    assert(match != NULL && "error: could not find device on the list");
    assert(match->available_nodes & (1 << DRM_NODE_PRIMARY));


    if (match->available_nodes & (1 << DRM_NODE_RENDER))
        appropriate_node = strdup(match->nodes[DRM_NODE_RENDER]);
    else
        appropriate_node = strdup(match->nodes[DRM_NODE_PRIMARY]);
    assert(appropriate_node && "error: could not get drm node");

    for (i = 0; i < num_devices; i++)
        drmFreeDevice(&devices[i]);
    free(devices);

    return appropriate_node;
}

static char *
get_drm_node(dev_t device)
{
    struct udev *udev;
    struct udev_device *udev_dev;
    const char *drm_node;

    udev = udev_new();
    assert(udev && "error: failed to create udev context object");

    udev_dev = udev_device_new_from_devnum(udev, 'c', device);
    assert(udev_dev && "error: failed to create udev device");

    drm_node = udev_device_get_devnode(udev_dev);
    assert(drm_node && "error: failed to retrieve drm node");

    udev_unref(udev);

    return get_most_appropriate_node(drm_node);
}

static void
feedback_tranche_send(
        const struct westfield_linux_dmabuf_feedback_v1_compiled_tranche *tranche,
        struct wl_resource *resource) {
    struct wl_array dev_array = {
            .size = sizeof(tranche->target_device),
            .data = (void *)&tranche->target_device,
    };

    wfl_log(stdout, "sending target device: %u:%u", major(tranche->target_device), minor(tranche->target_device));

    zwp_linux_dmabuf_feedback_v1_send_tranche_target_device(resource, &dev_array);
    zwp_linux_dmabuf_feedback_v1_send_tranche_flags(resource, tranche->flags);
    zwp_linux_dmabuf_feedback_v1_send_tranche_formats(resource,
                                                      (struct wl_array *)&tranche->indices);
    zwp_linux_dmabuf_feedback_v1_send_tranche_done(resource);
}

static void
feedback_send(const struct westfield_linux_dmabuf_feedback_v1_compiled *feedback, struct wl_resource *resource) {
    char *drm_node = get_drm_node(feedback->main_device);
    assert(drm_node && "error: failed to retrieve drm node");
    wfl_log(stderr, "feedback: main device %s", drm_node);

    struct wl_array dev_array = {
            .size = sizeof(feedback->main_device),
            .data = (void *)&feedback->main_device,
    };
    zwp_linux_dmabuf_feedback_v1_send_main_device(resource, &dev_array);

    zwp_linux_dmabuf_feedback_v1_send_format_table(resource,
                                                   feedback->table_fd, feedback->table_size);

    for (size_t i = 0; i < feedback->tranches_len; i++) {
        feedback_tranche_send(&feedback->tranches[i], resource);
    }

    zwp_linux_dmabuf_feedback_v1_send_done(resource);
}

static void
linux_dmabuf_get_default_feedback(struct wl_client *client,
                                  struct wl_resource *resource, uint32_t id) {
    struct westfield_linux_dmabuf_v1 *linux_dmabuf =
            linux_dmabuf_from_resource(resource);

    int version = wl_resource_get_version(resource);
    struct wl_resource *feedback_resource = wl_resource_create(client,
                                                               &zwp_linux_dmabuf_feedback_v1_interface, version, id);
    if (feedback_resource == NULL) {
        wl_client_post_no_memory(client);
        return;
    }
    wl_resource_set_implementation(feedback_resource, &linux_dmabuf_feedback_impl,
                                   NULL, NULL);

    feedback_send(linux_dmabuf->default_feedback, feedback_resource);
}

static void surface_destroy(struct westfield_linux_dmabuf_v1_surface *surface) {
    struct wl_resource *resource, *resource_tmp;
    wl_resource_for_each_safe(resource, resource_tmp, &surface->feedback_resources) {
        struct wl_list *link = wl_resource_get_link(resource);
        wl_list_remove(link);
        wl_list_init(link);
    }

    compiled_feedback_destroy(surface->feedback);

    addon_finish(&surface->addon);
    wl_list_remove(&surface->link);
    free(surface);
}

static void
surface_addon_destroy(struct addon *addon) {
    struct westfield_linux_dmabuf_v1_surface *surface =
            wl_container_of(addon, surface, addon);
    surface_destroy(surface);
}

static const struct addon_interface surface_addon_impl = {
        .name = "linux_dmabuf_v1_surface",
        .destroy = surface_addon_destroy,
};

static struct westfield_linux_dmabuf_v1_surface *
surface_get_or_create(struct westfield_linux_dmabuf_v1 *linux_dmabuf, struct westfield_surface *westfield_surface) {
    struct addon *addon =
            addon_find(&westfield_surface->addons, linux_dmabuf, &surface_addon_impl);
    if (addon != NULL) {
        struct westfield_linux_dmabuf_v1_surface *surface =
                wl_container_of(addon, surface, addon);
        return surface;
    }

    struct westfield_linux_dmabuf_v1_surface *surface = calloc(1, sizeof(*surface));
    if (surface == NULL) {
        return NULL;
    }

    surface->surface = westfield_surface;
    surface->linux_dmabuf = linux_dmabuf;
    wl_list_init(&surface->feedback_resources);
    addon_init(&surface->addon, &westfield_surface->addons, linux_dmabuf,
               &surface_addon_impl);
    wl_list_insert(&linux_dmabuf->surfaces, &surface->link);

    return surface;
}

static const struct westfield_linux_dmabuf_feedback_v1_compiled *
surface_get_feedback(struct westfield_linux_dmabuf_v1_surface *surface) {
    if (surface->feedback != NULL) {
        return surface->feedback;
    }
    return surface->linux_dmabuf->default_feedback;
}

static void
surface_feedback_handle_resource_destroy(struct wl_resource *resource) {
    wl_list_remove(wl_resource_get_link(resource));
}

static void
linux_dmabuf_get_surface_feedback(struct wl_client *client,
                                  struct wl_resource *resource, uint32_t id,
                                  struct wl_resource *surface_resource) {
    struct westfield_linux_dmabuf_v1 *linux_dmabuf = linux_dmabuf_from_resource(resource);
    struct westfield_surface *westfield_surface = wl_resource_get_user_data(surface_resource);
    if(westfield_surface == NULL) {
        westfield_surface = calloc(1, sizeof (struct westfield_surface));
        addon_set_init(&westfield_surface->addons);
        wl_resource_set_user_data(surface_resource, westfield_surface);
    }

    struct westfield_linux_dmabuf_v1_surface *surface =
            surface_get_or_create(linux_dmabuf, westfield_surface);
    if (surface == NULL) {
        wl_client_post_no_memory(client);
        return;
    }

    int version = wl_resource_get_version(resource);
    struct wl_resource *feedback_resource = wl_resource_create(client,
                                                               &zwp_linux_dmabuf_feedback_v1_interface, version, id);
    if (feedback_resource == NULL) {
        wl_client_post_no_memory(client);
        return;
    }
    wl_resource_set_implementation(feedback_resource, &linux_dmabuf_feedback_impl,
                                   NULL, surface_feedback_handle_resource_destroy);
    wl_list_insert(&surface->feedback_resources, wl_resource_get_link(feedback_resource));

    feedback_send(surface_get_feedback(surface), feedback_resource);
}

static void
linux_dmabuf_destroy(struct wl_client *client,
                     struct wl_resource *resource) {
    wl_resource_destroy(resource);
}

static const struct zwp_linux_dmabuf_v1_interface linux_dmabuf_impl = {
        .destroy = linux_dmabuf_destroy,
        .create_params = linux_dmabuf_create_params,
        .get_default_feedback = linux_dmabuf_get_default_feedback,
        .get_surface_feedback = linux_dmabuf_get_surface_feedback,
};

static void
linux_dmabuf_send_modifiers(struct wl_resource *resource, const struct drm_format *fmt) {
    if (wl_resource_get_version(resource) < ZWP_LINUX_DMABUF_V1_MODIFIER_SINCE_VERSION) {
        if (drm_format_has(fmt, DRM_FORMAT_MOD_INVALID)) {
            zwp_linux_dmabuf_v1_send_format(resource, fmt->format);
        }
        return;
    }

    // In case only INVALID and LINEAR are advertised, send INVALID only due to XWayland:
    // https://gitlab.freedesktop.org/xorg/xserver/-/issues/1166
    if (fmt->len == 2 && drm_format_has(fmt, DRM_FORMAT_MOD_INVALID)
        && drm_format_has(fmt, DRM_FORMAT_MOD_LINEAR)) {
        uint64_t mod = DRM_FORMAT_MOD_INVALID;
        zwp_linux_dmabuf_v1_send_modifier(resource, fmt->format,
                                          mod >> 32, mod & 0xFFFFFFFF);
        return;
    }

    for (size_t i = 0; i < fmt->len; i++) {
        uint64_t mod = fmt->modifiers[i];
        zwp_linux_dmabuf_v1_send_modifier(resource, fmt->format,
                                          mod >> 32, mod & 0xFFFFFFFF);
    }
}

static void
linux_dmabuf_send_formats(struct westfield_linux_dmabuf_v1 *linux_dmabuf, struct wl_resource *resource) {
    const struct drm_format_set *formats =
            westfield_egl_get_dmabuf_texture_formats(linux_dmabuf->renderer);
    if (formats == NULL) {
        return;
    }

    for (size_t i = 0; i < formats->len; i++) {
        const struct drm_format *fmt = formats->formats[i];
        linux_dmabuf_send_modifiers(resource, fmt);
    }
}

static void
linux_dmabuf_bind(struct wl_client *client, void *data,
                  uint32_t version, uint32_t id) {
    struct westfield_linux_dmabuf_v1 *linux_dmabuf = data;

    struct wl_resource *resource = wl_resource_create(client, &zwp_linux_dmabuf_v1_interface, version, id);
    if (resource == NULL) {
        wl_client_post_no_memory(client);
        return;
    }
    wl_resource_set_implementation(resource, &linux_dmabuf_impl,
                                   linux_dmabuf, NULL);

    if (version < ZWP_LINUX_DMABUF_V1_GET_DEFAULT_FEEDBACK_SINCE_VERSION) {
        linux_dmabuf_send_formats(linux_dmabuf, resource);
    }
}

struct westfield_linux_dmabuf_v1 *
westfield_linux_dmabuf_v1_create(struct wl_display *display, struct westfield_egl *renderer) {
    struct westfield_linux_dmabuf_v1 *linux_dmabuf =
            calloc(1, sizeof(struct westfield_linux_dmabuf_v1));
    if (linux_dmabuf == NULL) {
        wfl_log(stderr, "could not create simple dmabuf manager");
        return NULL;
    }
    linux_dmabuf->renderer = renderer;

    wl_list_init(&linux_dmabuf->surfaces);
    wl_signal_init(&linux_dmabuf->events.destroy);

    linux_dmabuf->global =
            wl_global_create(display, &zwp_linux_dmabuf_v1_interface,
                             LINUX_DMABUF_VERSION, linux_dmabuf, linux_dmabuf_bind);
    if (!linux_dmabuf->global) {
        wfl_log(stderr, "could not create linux dmabuf v1 wl global");
        free(linux_dmabuf);
        return NULL;
    }

    linux_dmabuf->default_feedback = compile_default_feedback(renderer);
    if (linux_dmabuf->default_feedback == NULL) {
        wfl_log(stderr, "Failed to init default linux-dmabuf feedback");
        wl_global_destroy(linux_dmabuf->global);
        free(linux_dmabuf);
        return NULL;
    }

//    linux_dmabuf->display_destroy.notify = handle_display_destroy;
//    wl_display_add_destroy_listener(display, &linux_dmabuf->display_destroy);
//
//    linux_dmabuf->renderer_destroy.notify = handle_renderer_destroy;
//    wl_signal_add(&renderer->events.destroy, &linux_dmabuf->renderer_destroy);

    return linux_dmabuf;
}