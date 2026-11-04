export async function resolve(specifier,context,nextResolve){
 if(specifier==='@minecraft/server')return {url:new URL('./mocks/server.js',import.meta.url).href,shortCircuit:true};
 if(specifier==='@minecraft/server-ui')return {url:new URL('./mocks/ui.js',import.meta.url).href,shortCircuit:true};
 return nextResolve(specifier,context);
}
