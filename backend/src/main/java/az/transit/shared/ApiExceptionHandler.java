package az.transit.shared;

import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ProblemDetail handle(ApiException exception) { return ProblemDetail.forStatusAndDetail(exception.status(), exception.getMessage()); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail validation(MethodArgumentNotValidException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Məlumatlar düzgün deyil: " +
            exception.getBindingResult().getFieldErrors().stream().map(e -> e.getField() + " " + e.getDefaultMessage()).toList());
    }
}
