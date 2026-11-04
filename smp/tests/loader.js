export async function resolve(specifier, context, next) {
    if (specifier === '@minecraft/server')
        return { url: new URL('./mock-server.js', import.meta.url).href, shortCircuit: true };
    if (specifier === '@minecraft/server-ui')
        return { url: new URL('./mock-ui.js', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
}
