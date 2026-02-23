/**
 * Auth Middleware — Optional HTTP Basic Authentication
 */

function authMiddleware(req, res, next) {
    // Skip auth for static files (CSS, JS, images)
    if (req.path.match(/\.(css|js|png|svg|ico|woff|woff2)$/)) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Serial Monitor"');
        return res.status(401).send('Authentication required');
    }

    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
    const [user, pass] = credentials.split(':');

    const validUser = process.env.AUTH_USER || 'admin';
    const validPass = process.env.AUTH_PASS || 'changeme';

    if (user === validUser && pass === validPass) {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Serial Monitor"');
    return res.status(401).send('Invalid credentials');
}

module.exports = authMiddleware;
