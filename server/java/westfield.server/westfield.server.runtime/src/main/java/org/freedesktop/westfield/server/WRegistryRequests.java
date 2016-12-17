package org.freedesktop.westfield.server;


public interface WRegistryRequests {

    String NAME    = "WRegistryResource";
    int    VERSION = 1;

    void bind(WRegistryResource wRegistryResource,
              int id,
              int version);
}