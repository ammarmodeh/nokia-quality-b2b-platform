const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`, err.stack);

    // Handle CORS errors specifically
    if (err.message.includes('Not allowed by CORS')) {
        return res.status(403).json({
            success: false,
            message: err.message,
        });
    }

    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Server Error",
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

const routeNotFound = (req, res, next) => {
    console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export { errorHandler, routeNotFound };
