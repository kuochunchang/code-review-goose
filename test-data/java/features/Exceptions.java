package com.example.features;

class AppException extends Exception {
    public AppException(String message) {
        super(message);
    }
}

class ValidationException extends AppException {
    public ValidationException(String message) {
        super("Validation Error: " + message);
    }
}

public class Exceptions {
    public void validate(String input) throws ValidationException {
        if (input == null) {
            throw new ValidationException("Input cannot be null");
        }
    }
}
