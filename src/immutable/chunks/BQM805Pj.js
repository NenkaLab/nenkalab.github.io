import{i as g,g as D,H,a as L,b as y,s as c,c as E,h as O,d as _,e as I,f as Y,j,k,l as C,m as M,n as S,o as V,p as $,q,r as w,t as P,u as W}from"./CY5OHCJa.js";import{a as z,r as b,h,i as B}from"./CKxA5OKI.js";import{r as F}from"./DoMPbZzj.js";import{b as G}from"./CU5X3Lr4.js";function Z(r,e){var t=e==null?"":typeof e=="object"?e+"":e;t!==(r.__t??(r.__t=r.nodeValue))&&(r.__t=t,r.nodeValue=t+"")}function J(r,e){return N(r,e)}function x(r,e){g(),e.intro=e.intro??!1;const t=e.target,l=w,u=_;try{for(var a=D(t);a&&(a.nodeType!==8||a.data!==H);)a=L(a);if(!a)throw y;c(!0),E(a),O();const d=N(r,{...e,anchor:a});if(_===null||_.nodeType!==8||_.data!==I)throw Y(),y;return c(!1),d}catch(d){if(d===y)return e.recover===!1&&j(),g(),k(t),c(!1),J(r,e);throw d}finally{c(l),E(u),F()}}const i=new Map;function N(r,{target:e,anchor:t,props:l={},events:u,context:a,intro:d=!0}){g();var m=new Set,p=o=>{for(var s=0;s<o.length;s++){var n=o[s];if(!m.has(n)){m.add(n);var f=B(n);e.addEventListener(n,h,{passive:f});var T=i.get(n);T===void 0?(document.addEventListener(n,h,{passive:f}),i.set(n,1)):i.set(n,T+1)}}};p(C(z)),b.add(p);var v=void 0,A=M(()=>{var o=t??e.appendChild(S());return V(()=>{if(a){$({});var s=q;s.c=a}u&&(l.$$events=u),w&&G(o,null),v=r(o,l)||{},w&&(P.nodes_end=_),a&&W()}),()=>{var f;for(var s of m){e.removeEventListener(s,h);var n=i.get(s);--n===0?(document.removeEventListener(s,h),i.delete(s)):i.set(s,n)}b.delete(p),o!==t&&((f=o.parentNode)==null||f.removeChild(o))}});return R.set(v,A),v}let R=new WeakMap;function ee(r,e){const t=R.get(r);return t?(R.delete(r),t(e)):Promise.resolve()}export{x as h,J as m,Z as s,ee as u};
