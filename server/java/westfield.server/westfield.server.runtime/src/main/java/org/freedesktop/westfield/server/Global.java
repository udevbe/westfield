package org.freedesktop.westfield.server;


public abstract class Global {
    private final String interfaceName;
    private final int    version;

    public Global(final String interfaceName,
                  final int version) {
        this.interfaceName = interfaceName;
        this.version = version;
    }

    public abstract void bindClient(final Client client,
                                    final int id,
                                    final int version);

    String getInterfaceName() {
        return this.interfaceName;
    }

    int getVersion() {
        return this.version;
    }
}
