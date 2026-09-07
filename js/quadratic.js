(function(global){
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b]}return a||1}
function fmt(n){return Number.isInteger(n)?String(n):String(n).replace('.',',')}
function frac(n,d){return new Frac(n,d)}
function clean(s){return String(s).replace(/\s+/g,'').replace(/−/g,'-').replace(/²/g,'^2')}
function parseQuadratic(text){
 const lines=String(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);if(lines.length!==1)return{ok:false,error:'Una ecuación cuadrática debe escribirse en una sola línea.'};
 let raw=clean(lines[0]);if(!raw.includes('='))return{ok:false,error:'Falta el signo = en la ecuación cuadrática.'};
 let [L,R]=raw.split('=');if(R===undefined||raw.split('=').length!==2)return{ok:false,error:'La ecuación debe tener un solo signo =.'};
 function terms(side,sign){let out={a:0,b:0,c:0};if(!side)throw Error('Lado vacío');const str=(side[0]=='+'||side[0]=='-')?side:'+'+side;const parts=str.match(/[+-][^+-]+/g)||[];for(let t of parts){let sg=t[0]=='-'?-1:1;t=t.slice(1);if(/x\^2$/i.test(t)){let n=t.slice(0,-3);out.a+=sg*(n===''?1:Number(n));}else if(/x$/i.test(t)){let n=t.slice(0,-1);out.b+=sg*(n===''?1:Number(n));}else{out.c+=sg*Number(t)}}return out}
 try{const l=terms(L,1),r=terms(R,-1);const a=l.a-r.a,b=l.b-r.b,c=l.c-r.c;if(!Number.isFinite(a+b+c)||a===0)return{ok:false,error:'No se detectó un término x². Esto no parece una ecuación cuadrática.'};return{ok:true,type:'quadratic',a,b,c,source:lines[0]}}catch(e){return{ok:false,error:'No se pudo interpretar la ecuación. Usa, por ejemplo: x^2 - 5x + 6 = 0.'}}
}
function nfmt(n,first){if(n===0)return'';return (n>0&&!first?'+':'')+(n===1?'':n===-1?'-':fmt(n))}
function standard(a,b,c){let s=nfmt(a,true)+'x²';if(b)s+=nfmt(b,false)+'x';if(c)s+=nfmt(c,false);return s+'=0'}
function mdEq(s){return '$$'+s+'$$'}
function value(v){if(v instanceof Frac){if(v.d===1)return v.toString();let d=v.toNumber();return v.toString()+'≈'+d.toFixed(6).replace(/0+$/,'').replace(/\.$/,'').replace('.',',')}return fmt(v)}
function solutionBlock(roots){return '$$\\boxed{'+roots.map((r,i)=>'x_'+(i+1)+'='+r).join('\\\\')+'}$$'}
function integerFactors(a,b,c){if(!Number.isInteger(a)||!Number.isInteger(b)||!Number.isInteger(c))return null;for(let p=-Math.abs(c||1);p<=Math.abs(c||1);p++){if(p===0&&c!==0)continue;for(let q=-Math.abs(c||1);q<=Math.abs(c||1);q++){if(a===1&&p*q===c&&p+q===b)return[p,q]}}return null}
function solveQuadratic(q,method){const {a,b,c}=q,steps=[];steps.push({titulo:'Paso 1',markdown:mdEq(standard(a,b,c))});steps.push({titulo:'Paso 2',markdown:'Identificamos los coeficientes de la forma '+mdEq('ax²+bx+c=0')+'$$a='+fmt(a)+',\\quad b='+fmt(b)+',\\quad c='+fmt(c)+'$$'});
 if(method==='raiz' && b===0){steps.push({titulo:'Paso 3',markdown:mdEq(fmt(a)+'x²='+fmt(-c))+'$$x²=\\frac{'+fmt(-c)+'}{'+fmt(a)+'}$$'});const rad=-c/a;if(rad>=0){const r=Math.sqrt(rad);steps.push({titulo:'Resultado',markdown:solutionBlock(['+'+fmt(r),'−'+fmt(r)])});return{ok:true,steps,roots:[r,-r],type:'quadratic'}}}
 if(method==='factorizacion'||method==='auto'){if(a===1){const pair=integerFactors(a,b,c);if(pair){const[p,q]=pair;steps.push({titulo:'Paso 3',markdown:mdEq('(x'+(p>=0?'+':'')+fmt(p)+')(x'+(q>=0?'+':'')+fmt(q)+')=0')});steps.push({titulo:'Paso 4',markdown:'Por la propiedad del producto nulo:'+mdEq('x'+(p>=0?'+':'')+fmt(p)+'=0\\quad\\text{o}\\quad x'+(q>=0?'+':'')+fmt(q)+'=0')});steps.push({titulo:'Resultado',markdown:solutionBlock([fmt(-p),fmt(-q)])});return{ok:true,steps,roots:[-p,-q],type:'quadratic'}}}}
 const disc=b*b-4*a*c;steps.push({titulo:'Paso 3',markdown:'Calculamos el discriminante:'+mdEq('Δ=b²−4ac')+mdEq('Δ=('+fmt(b)+')²−4('+fmt(a)+')('+fmt(c)+')='+fmt(disc))});
 steps.push({titulo:'Paso 4',markdown:'Aplicamos la fórmula general:'+mdEq('x=\\frac{−b\\pm\\sqrt{b²−4ac}}{2a}')+mdEq('x=\\frac{−('+fmt(b)+')\\pm\\sqrt{'+fmt(disc)+'}}{'+fmt(2*a)+'}')});
 if(disc>0){const r=Math.sqrt(disc),x1=(-b+r)/(2*a),x2=(-b-r)/(2*a);steps.push({titulo:'Paso 5',markdown:mdEq('x_1=\\frac{−'+fmt(b)+'+'+fmt(r)+'}{'+fmt(2*a)+'}='+fmt(x1))+mdEq('x_2=\\frac{−'+fmt(b)+'−'+fmt(r)+'}{'+fmt(2*a)+'}='+fmt(x2))});steps.push({titulo:'Resultado',markdown:solutionBlock([fmt(x1),fmt(x2)])});return{ok:true,steps,roots:[x1,x2],type:'quadratic'}}
 if(disc===0){const x=-b/(2*a);steps.push({titulo:'Resultado',markdown:solutionBlock([fmt(x)])});return{ok:true,steps,roots:[x],type:'quadratic'}}
 const real=-b/(2*a),imag=Math.sqrt(-disc)/(2*Math.abs(a));steps.push({titulo:'Resultado',markdown:solutionBlock([fmt(real)+'+'+fmt(imag)+'i',fmt(real)+'−'+fmt(imag)+'i'])});return{ok:true,steps,roots:[{re:real,im:imag},{re:real,im:-imag}],type:'quadratic'}
}
global.parseQuadratic=parseQuadratic;global.QUADRATIC_METHODS={auto:{id:'auto',name:'Automático'},factorizacion:{id:'factorizacion',name:'Factorización'},formula:{id:'formula',name:'Fórmula general'},raiz:{id:'raiz',name:'Extracción de raíz'}};global.solveQuadratic=solveQuadratic;
})(window);