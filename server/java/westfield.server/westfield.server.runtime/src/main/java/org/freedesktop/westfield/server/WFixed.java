package org.freedesktop.westfield.server;


public class WFixed extends Number {

    private final int raw;

    WFixed(final int raw) {
        this.raw = raw;
    }

    @Override
    public int intValue() {
        return this.raw >> 8;
    }

    @Override
    public long longValue() {
        return intValue();
    }

    @Override
    public float floatValue() {
        return (float) (this.raw / 256.0);
    }

    @Override
    public double doubleValue() {
        return (this.raw / 256.0);
    }

    int rawValue() {
        return this.raw;
    }


    public static WFixed valueOf(final int value) {
        return new WFixed(value << 8);
    }

    public static WFixed valueOf(final long value) {
        return valueOf((int) value);
    }

    public static WFixed valueOf(final float value) {
        return new WFixed((int) (value * 256.0));
    }

    public static WFixed valueOf(final double value) {
        return new WFixed((int) (value * 256.0));
    }
}
