package org.freedesktop.westfield.server.example;


import org.freedesktop.westfield.server.WClient;
import org.freedesktop.westfield.server.WGlobal;

public class ExampleGlobal extends WGlobal {

    public ExampleGlobal() {
        super(ExampleGlobal.class.getSimpleName(),
              1);
    }

    @Override
    public void bindClient(final WClient client,
                           final int id,
                           final int version) {

    }
}
