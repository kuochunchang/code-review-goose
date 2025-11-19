package com.example.features;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Annotations {
    String value() default "default";
}

class AnnotatedClass {
    @Annotations("custom")
    public void method() {
        System.out.println("Annotated method");
    }
}
