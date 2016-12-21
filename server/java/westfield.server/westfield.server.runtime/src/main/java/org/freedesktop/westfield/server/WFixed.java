package org.freedesktop.westfield.server;


public class WFixed extends Number {

    private final int raw;

    WFixed(final int raw) {
        this.raw = raw;
    }

    @Override
    public int intValue() {
        return raw >> 8;
    }

    @Override
    public long longValue() {
        return intValue();
    }

    @Override
    public float floatValue() {
        return (float) (raw / 256.0);
    }

    @Override
    public double doubleValue() {
        return (raw / 256.0);
    }

    int rawValue() {
        return this.raw;
    }


    public static WFixed valueOf(int value) {
        return new WFixed(value << 8);
    }

    public static WFixed valueOf(long value) {
        return valueOf((int) value);
    }

    public static WFixed valueOf(float value) {
        return new WFixed((int) (value * 256.0));
    }

    public static WFixed valueOf(double value) {
        return new WFixed((int) (value * 256.0));
    }
}
