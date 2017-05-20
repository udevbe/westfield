package org.freedesktop.westfield.server;


public class Fixed extends Number {

    private final int raw;

    Fixed(final int raw) {
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


    public static Fixed valueOf(final int value) {
        return new Fixed(value << 8);
    }

    public static Fixed valueOf(final long value) {
        return valueOf((int) value);
    }

    public static Fixed valueOf(final float value) {
        return new Fixed((int) (value * 256.0));
    }

    public static Fixed valueOf(final double value) {
        return new Fixed((int) (value * 256.0));
    }
}
