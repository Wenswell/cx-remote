(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=e=>{var t;let{activeElement:n}=document;n&&e.contains(n)&&((t=document.activeElement)==null||t.blur())},t=globalThis,n=t.ShadowRoot&&(t.ShadyCSS===void 0||t.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,r=Symbol(),i=new WeakMap,a=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(n&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=i.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&i.set(t,e))}return e}toString(){return this.cssText}},o=e=>new a(typeof e==`string`?e:e+``,void 0,r),s=(e,...t)=>new a(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,r),c=(e,r)=>{if(n)e.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of r){let r=document.createElement(`style`),i=t.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=n.cssText,e.appendChild(r)}},l=n?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return o(t)})(e):e,{is:u,defineProperty:d,getOwnPropertyDescriptor:f,getOwnPropertyNames:p,getOwnPropertySymbols:m,getPrototypeOf:h}=Object,g=globalThis,_=g.trustedTypes,ee=_?_.emptyScript:``,v=g.reactiveElementPolyfillSupport,te=(e,t)=>e,y={toAttribute(e,t){switch(t){case Boolean:e=e?ee:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},ne=(e,t)=>!u(e,t),b={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:ne};Symbol.metadata??=Symbol(`metadata`),g.litPropertyMetadata??=new WeakMap;var x=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=b){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&d(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=f(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??b}static _$Ei(){if(this.hasOwnProperty(te(`elementProperties`)))return;let e=h(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(te(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(te(`properties`))){let e=this.properties,t=[...p(e),...m(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(l(e))}else e!==void 0&&t.push(l(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return c(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?y:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?y:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??ne)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};x.elementStyles=[],x.shadowRootOptions={mode:`open`},x[te(`elementProperties`)]=new Map,x[te(`finalized`)]=new Map,v?.({ReactiveElement:x}),(g.reactiveElementVersions??=[]).push(`2.1.2`);var S=globalThis,re=e=>e,ie=S.trustedTypes,ae=ie?ie.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,oe=`$lit$`,C=`lit$${Math.random().toFixed(9).slice(2)}$`,se=`?`+C,ce=`<${se}>`,le=document,ue=()=>le.createComment(``),de=e=>e===null||typeof e!=`object`&&typeof e!=`function`,fe=Array.isArray,pe=e=>fe(e)||typeof e?.[Symbol.iterator]==`function`,me=`[ 	
\f\r]`,he=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ge=/-->/g,_e=/>/g,ve=RegExp(`>|${me}(?:([^\\s"'>=/]+)(${me}*=${me}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),ye=/'/g,be=/"/g,xe=/^(?:script|style|textarea|title)$/i,w=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),T=Symbol.for(`lit-noChange`),E=Symbol.for(`lit-nothing`),Se=new WeakMap,Ce=le.createTreeWalker(le,129);function we(e,t){if(!fe(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return ae===void 0?t:ae.createHTML(t)}var Te=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=he;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===he?c[1]===`!--`?o=ge:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=ve):(xe.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=ve):o=_e:o===ve?c[0]===`>`?(o=i??he,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?ve:c[3]===`"`?be:ye):o===be||o===ye?o=ve:o===ge||o===_e?o=he:(o=ve,i=void 0);let d=o===ve&&e[t+1].startsWith(`/>`)?` `:``;a+=o===he?n+ce:l>=0?(r.push(s),n.slice(0,l)+oe+n.slice(l)+C+d):n+C+(l===-2?t:d)}return[we(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},Ee=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=Te(t,n);if(this.el=e.createElement(l,r),Ce.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=Ce.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(oe)){let t=u[o++],n=i.getAttribute(e).split(C),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?je:r[1]===`?`?Me:r[1]===`@`?Ne:Ae}),i.removeAttribute(e)}else e.startsWith(C)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(xe.test(i.tagName)){let e=i.textContent.split(C),t=e.length-1;if(t>0){i.textContent=ie?ie.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],ue()),Ce.nextNode(),c.push({type:2,index:++a});i.append(e[t],ue())}}}else if(i.nodeType===8)if(i.data===se)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(C,e+1))!==-1;)c.push({type:7,index:a}),e+=C.length-1}a++}}static createElement(e,t){let n=le.createElement(`template`);return n.innerHTML=e,n}};function De(e,t,n=e,r){if(t===T)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=de(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=De(e,i._$AS(e,t.values),i,r)),t}var Oe=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??le).importNode(t,!0);Ce.currentNode=r;let i=Ce.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new ke(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new Pe(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=Ce.nextNode(),a++)}return Ce.currentNode=le,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},ke=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=E,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=De(this,e,t),de(e)?e===E||e==null||e===``?(this._$AH!==E&&this._$AR(),this._$AH=E):e!==this._$AH&&e!==T&&this._(e):e._$litType$===void 0?e.nodeType===void 0?pe(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==E&&de(this._$AH)?this._$AA.nextSibling.data=e:this.T(le.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=Ee.createElement(we(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new Oe(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=Se.get(e.strings);return t===void 0&&Se.set(e.strings,t=new Ee(e)),t}k(t){fe(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(ue()),this.O(ue()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=re(e).nextSibling;re(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},Ae=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=E,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=E}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=De(this,e,t,0),a=!de(e)||e!==this._$AH&&e!==T,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=De(this,r[n+o],t,o),s===T&&(s=this._$AH[o]),a||=!de(s)||s!==this._$AH[o],s===E?e=E:e!==E&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===E?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},je=class extends Ae{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===E?void 0:e}},Me=class extends Ae{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==E)}},Ne=class extends Ae{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=De(this,e,t,0)??E)===T)return;let n=this._$AH,r=e===E&&n!==E||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==E&&(n===E||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Pe=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){De(this,e)}},Fe={M:oe,P:C,A:se,C:1,L:Te,R:Oe,D:pe,V:De,I:ke,H:Ae,N:Me,U:Ne,B:je,F:Pe},Ie=S.litHtmlPolyfillSupport;Ie?.(Ee,ke),(S.litHtmlVersions??=[]).push(`3.3.3`);var Le=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new ke(t.insertBefore(ue(),e),e,void 0,n??{})}return i._$AI(e),i},Re=globalThis,ze=class extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Le(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return T}};ze._$litElement$=!0,ze.finalized=!0,Re.litElementHydrateSupport?.({LitElement:ze});var Be=Re.litElementPolyfillSupport;Be?.({LitElement:ze}),(Re.litElementVersions??=[]).push(`4.2.2`);var Ve=s`
  :host {
    display: inline-block;
    color: var(--sl-color-neutral-600);
  }

  .icon-button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    border-radius: var(--sl-border-radius-medium);
    font-size: inherit;
    color: inherit;
    padding: var(--sl-spacing-x-small);
    cursor: pointer;
    transition: var(--sl-transition-x-fast) color;
    -webkit-appearance: none;
  }

  .icon-button:hover:not(.icon-button--disabled),
  .icon-button:focus-visible:not(.icon-button--disabled) {
    color: var(--sl-color-primary-600);
  }

  .icon-button:active:not(.icon-button--disabled) {
    color: var(--sl-color-primary-700);
  }

  .icon-button:focus {
    outline: none;
  }

  .icon-button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-button:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .icon-button__icon {
    pointer-events: none;
  }
`,He=``;function Ue(e){He=e}function We(e=``){if(!He){let e=[...document.getElementsByTagName(`script`)],t=e.find(e=>e.hasAttribute(`data-shoelace`));if(t)Ue(t.getAttribute(`data-shoelace`));else{let t=e.find(e=>/shoelace(\.min)?\.js($|\?)/.test(e.src)||/shoelace-autoloader(\.min)?\.js($|\?)/.test(e.src)),n=``;t&&(n=t.getAttribute(`src`)),Ue(n.split(`/`).slice(0,-1).join(`/`))}}return He.replace(/\/$/,``)+(e?`/${e.replace(/^\//,``)}`:``)}var Ge={name:`default`,resolver:e=>We(`assets/icons/${e}.svg`)},Ke={caret:`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `,check:`
    <svg part="checked-icon" class="checkbox__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
        <g stroke="currentColor">
          <g transform="translate(3.428571, 3.428571)">
            <path d="M0,5.71428571 L3.42857143,9.14285714"></path>
            <path d="M9.14285714,0 L3.42857143,9.14285714"></path>
          </g>
        </g>
      </g>
    </svg>
  `,"chevron-down":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
    </svg>
  `,"chevron-left":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-left" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
    </svg>
  `,"chevron-right":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-right" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
    </svg>
  `,copy:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6ZM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2Z"/>
    </svg>
  `,eye:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>
  `,"eye-slash":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-slash" viewBox="0 0 16 16">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
    </svg>
  `,eyedropper:`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eyedropper" viewBox="0 0 16 16">
      <path d="M13.354.646a1.207 1.207 0 0 0-1.708 0L8.5 3.793l-.646-.647a.5.5 0 1 0-.708.708L8.293 5l-7.147 7.146A.5.5 0 0 0 1 12.5v1.793l-.854.853a.5.5 0 1 0 .708.707L1.707 15H3.5a.5.5 0 0 0 .354-.146L11 7.707l1.146 1.147a.5.5 0 0 0 .708-.708l-.647-.646 3.147-3.146a1.207 1.207 0 0 0 0-1.708l-2-2zM2 12.707l7-7L10.293 7l-7 7H2v-1.293z"></path>
    </svg>
  `,"grip-vertical":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-grip-vertical" viewBox="0 0 16 16">
      <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>
    </svg>
  `,indeterminate:`
    <svg part="indeterminate-icon" class="checkbox__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
        <g stroke="currentColor" stroke-width="2">
          <g transform="translate(2.285714, 6.857143)">
            <path d="M10.2857143,1.14285714 L1.14285714,1.14285714"></path>
          </g>
        </g>
      </g>
    </svg>
  `,"person-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16">
      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    </svg>
  `,"play-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"></path>
    </svg>
  `,"pause-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"></path>
    </svg>
  `,radio:`
    <svg part="checked-icon" class="radio__icon" viewBox="0 0 16 16">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g fill="currentColor">
          <circle cx="8" cy="8" r="3.42857143"></circle>
        </g>
      </g>
    </svg>
  `,"star-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16">
      <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
    </svg>
  `,"x-lg":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
    </svg>
  `,"x-circle-fill":`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16">
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
    </svg>
  `},qe=[Ge,{name:`system`,resolver:e=>e in Ke?`data:image/svg+xml,${encodeURIComponent(Ke[e])}`:``}],Je=[];function Ye(e){Je.push(e)}function Xe(e){Je=Je.filter(t=>t!==e)}function Ze(e){return qe.find(t=>t.name===e)}var Qe=s`
  :host {
    display: inline-block;
    width: 1em;
    height: 1em;
    box-sizing: content-box !important;
  }

  svg {
    display: block;
    height: 100%;
    width: 100%;
  }
`,$e=Object.defineProperty,et=Object.defineProperties,tt=Object.getOwnPropertyDescriptor,nt=Object.getOwnPropertyDescriptors,rt=Object.getOwnPropertySymbols,it=Object.prototype.hasOwnProperty,at=Object.prototype.propertyIsEnumerable,ot=(e,t)=>(t=Symbol[e])?t:Symbol.for(`Symbol.`+e),st=e=>{throw TypeError(e)},ct=(e,t,n)=>t in e?$e(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,lt=(e,t)=>{for(var n in t||={})it.call(t,n)&&ct(e,n,t[n]);if(rt)for(var n of rt(t))at.call(t,n)&&ct(e,n,t[n]);return e},ut=(e,t)=>et(e,nt(t)),D=(e,t,n,r)=>{for(var i=r>1?void 0:r?tt(t,n):t,a=e.length-1,o;a>=0;a--)(o=e[a])&&(i=(r?o(t,n,i):o(i))||i);return r&&i&&$e(t,n,i),i},dt=(e,t,n)=>t.has(e)||st(`Cannot `+n),ft=(e,t,n)=>(dt(e,t,`read from private field`),n?n.call(e):t.get(e)),pt=(e,t,n)=>t.has(e)?st(`Cannot add the same private member more than once`):t instanceof WeakSet?t.add(e):t.set(e,n),mt=(e,t,n,r)=>(dt(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),ht=function(e,t){this[0]=e,this[1]=t},gt=e=>{var t=e[ot(`asyncIterator`)],n=!1,r,i={};return t==null?(t=e[ot(`iterator`)](),r=e=>i[e]=n=>t[e](n)):(t=t.call(e),r=e=>i[e]=r=>{if(n){if(n=!1,e===`throw`)throw r;return r}return n=!0,{done:!1,value:new ht(new Promise(n=>{var i=t[e](r);i instanceof Object||st(`Object expected`),n(i)}),1)}}),i[ot(`iterator`)]=()=>i,r(`next`),`throw`in t?r(`throw`):i.throw=e=>{throw e},`return`in t&&r(`return`),i};function O(e,t){let n=lt({waitUntilFirstUpdate:!1},t);return(t,r)=>{let{update:i}=t,a=Array.isArray(e)?e:[e];t.update=function(e){a.forEach(t=>{let i=t;if(e.has(i)){let t=e.get(i),a=this[i];t!==a&&(!n.waitUntilFirstUpdate||this.hasUpdated)&&this[r](t,a)}}),i.call(this,e)}}}var k=s`
  :host {
    box-sizing: border-box;
  }

  :host *,
  :host *::before,
  :host *::after {
    box-sizing: inherit;
  }

  [hidden] {
    display: none !important;
  }
`,_t={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:ne},vt=(e=_t,t,n)=>{let{kind:r,metadata:i}=n,a=globalThis.litPropertyMetadata.get(i);if(a===void 0&&globalThis.litPropertyMetadata.set(i,a=new Map),r===`setter`&&((e=Object.create(e)).wrapped=!0),a.set(n.name,e),r===`accessor`){let{name:r}=n;return{set(n){let i=t.get.call(this);t.set.call(this,n),this.requestUpdate(r,i,e,!0,n)},init(t){return t!==void 0&&this.C(r,void 0,e,t),t}}}if(r===`setter`){let{name:r}=n;return function(n){let i=this[r];t.call(this,n),this.requestUpdate(r,i,e,!0,n)}}throw Error(`Unsupported decorator location: `+r)};function A(e){return(t,n)=>typeof n==`object`?vt(e,t,n):((e,t,n)=>{let r=t.hasOwnProperty(n);return t.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(t,n):void 0})(e,t,n)}function j(e){return A({...e,state:!0,attribute:!1})}var yt=(e,t,n)=>(n.configurable=!0,n.enumerable=!0,Reflect.decorate&&typeof t!=`object`&&Object.defineProperty(e,t,n),n);function M(e,t){return(n,r,i)=>{let a=t=>t.renderRoot?.querySelector(e)??null;if(t){let{get:e,set:t}=typeof r==`object`?n:i??(()=>{let e=Symbol();return{get(){return this[e]},set(t){this[e]=t}}})();return yt(n,r,{get(){let n=e.call(this);return n===void 0&&(n=a(this),(n!==null||this.hasUpdated)&&t.call(this,n)),n}})}return yt(n,r,{get(){return a(this)}})}}var bt,N=class extends ze{constructor(){super(),pt(this,bt,!1),this.initialReflectedProperties=new Map,Object.entries(this.constructor.dependencies).forEach(([e,t])=>{this.constructor.define(e,t)})}emit(e,t){let n=new CustomEvent(e,lt({bubbles:!0,cancelable:!1,composed:!0,detail:{}},t));return this.dispatchEvent(n),n}static define(e,t=this,n={}){let r=customElements.get(e);if(!r){try{customElements.define(e,t,n)}catch{customElements.define(e,class extends t{},n)}return}let i=` (unknown version)`,a=i;`version`in t&&t.version&&(i=` v`+t.version),`version`in r&&r.version&&(a=` v`+r.version),!(i&&a&&i===a)&&console.warn(`Attempted to register <${e}>${i}, but <${e}>${a} has already been registered.`)}attributeChangedCallback(e,t,n){ft(this,bt)||(this.constructor.elementProperties.forEach((e,t)=>{e.reflect&&this[t]!=null&&this.initialReflectedProperties.set(t,this[t])}),mt(this,bt,!0)),super.attributeChangedCallback(e,t,n)}willUpdate(e){super.willUpdate(e),this.initialReflectedProperties.forEach((t,n)=>{e.has(n)&&this[n]==null&&(this[n]=t)})}};bt=new WeakMap,N.version=`2.20.1`,N.dependencies={},D([A()],N.prototype,`dir`,2),D([A()],N.prototype,`lang`,2);var{I:xt}=Fe,St=(e,t)=>t===void 0?e?._$litType$!==void 0:e?._$litType$===t,Ct=e=>e.strings===void 0,wt={},Tt=(e,t=wt)=>e._$AH=t,Et=Symbol(),Dt=Symbol(),Ot,kt=new Map,P=class extends N{constructor(){super(...arguments),this.initialRender=!1,this.svg=null,this.label=``,this.library=`default`}async resolveIcon(e,t){let n;if(t?.spriteSheet)return this.svg=w`<svg part="svg">
        <use part="use" href="${e}"></use>
      </svg>`,this.svg;try{if(n=await fetch(e,{mode:`cors`}),!n.ok)return n.status===410?Et:Dt}catch{return Dt}try{let e=document.createElement(`div`);e.innerHTML=await n.text();let t=e.firstElementChild;if((t?.tagName)?.toLowerCase()!==`svg`)return Et;Ot||=new DOMParser;let r=Ot.parseFromString(t.outerHTML,`text/html`).body.querySelector(`svg`);return r?(r.part.add(`svg`),document.adoptNode(r)):Et}catch{return Et}}connectedCallback(){super.connectedCallback(),Ye(this)}firstUpdated(){this.initialRender=!0,this.setIcon()}disconnectedCallback(){super.disconnectedCallback(),Xe(this)}getIconSource(){let e=Ze(this.library);return this.name&&e?{url:e.resolver(this.name),fromLibrary:!0}:{url:this.src,fromLibrary:!1}}handleLabelChange(){typeof this.label==`string`&&this.label.length>0?(this.setAttribute(`role`,`img`),this.setAttribute(`aria-label`,this.label),this.removeAttribute(`aria-hidden`)):(this.removeAttribute(`role`),this.removeAttribute(`aria-label`),this.setAttribute(`aria-hidden`,`true`))}async setIcon(){var e;let{url:t,fromLibrary:n}=this.getIconSource(),r=n?Ze(this.library):void 0;if(!t){this.svg=null;return}let i=kt.get(t);if(i||(i=this.resolveIcon(t,r),kt.set(t,i)),!this.initialRender)return;let a=await i;if(a===Dt&&kt.delete(t),t===this.getIconSource().url){if(St(a)){if(this.svg=a,r){await this.updateComplete;let e=this.shadowRoot.querySelector(`[part='svg']`);typeof r.mutator==`function`&&e&&r.mutator(e)}return}switch(a){case Dt:case Et:this.svg=null,this.emit(`sl-error`);break;default:this.svg=a.cloneNode(!0),(e=r?.mutator)==null||e.call(r,this.svg),this.emit(`sl-load`)}}}render(){return this.svg}};P.styles=[k,Qe],D([j()],P.prototype,`svg`,2),D([A({reflect:!0})],P.prototype,`name`,2),D([A()],P.prototype,`src`,2),D([A()],P.prototype,`label`,2),D([A({reflect:!0})],P.prototype,`library`,2),D([O(`label`)],P.prototype,`handleLabelChange`,1),D([O([`name`,`src`,`library`])],P.prototype,`setIcon`,1);var At={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},jt=e=>(...t)=>({_$litDirective$:e,values:t}),Mt=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,n){this._$Ct=e,this._$AM=t,this._$Ci=n}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}},F=jt(class extends Mt{constructor(e){if(super(e),e.type!==At.ATTRIBUTE||e.name!==`class`||e.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return` `+Object.keys(e).filter(t=>e[t]).join(` `)+` `}update(e,[t]){if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(` `).split(/\s/).filter(e=>e!==``)));for(let e in t)t[e]&&!this.nt?.has(e)&&this.st.add(e);return this.render(t)}let n=e.element.classList;for(let e of this.st)e in t||(n.remove(e),this.st.delete(e));for(let e in t){let r=!!t[e];r===this.st.has(e)||this.nt?.has(e)||(r?(n.add(e),this.st.add(e)):(n.remove(e),this.st.delete(e)))}return T}}),Nt=Symbol.for(``),Pt=e=>{if(e?.r===Nt)return e?._$litStatic$},Ft=(e,...t)=>({_$litStatic$:t.reduce((t,n,r)=>t+(e=>{if(e._$litStatic$!==void 0)return e._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${e}. Use 'unsafeStatic' to pass non-literal values, but\n            take care to ensure page security.`)})(n)+e[r+1],e[0]),r:Nt}),It=new Map,Lt=(e=>(t,...n)=>{let r=n.length,i,a,o=[],s=[],c,l=0,u=!1;for(;l<r;){for(c=t[l];l<r&&(a=n[l],i=Pt(a))!==void 0;)c+=i+t[++l],u=!0;l!==r&&s.push(a),o.push(c),l++}if(l===r&&o.push(t[r]),u){let e=o.join(`$$lit$$`);(t=It.get(e))===void 0&&(o.raw=o,It.set(e,t=o)),n=s}return e(t,...n)})(w),I=e=>e??E,L=class extends N{constructor(){super(...arguments),this.hasFocus=!1,this.label=``,this.disabled=!1}handleBlur(){this.hasFocus=!1,this.emit(`sl-blur`)}handleFocus(){this.hasFocus=!0,this.emit(`sl-focus`)}handleClick(e){this.disabled&&(e.preventDefault(),e.stopPropagation())}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}render(){let e=!!this.href,t=e?Ft`a`:Ft`button`;return Lt`
      <${t}
        part="base"
        class=${F({"icon-button":!0,"icon-button--disabled":!e&&this.disabled,"icon-button--focused":this.hasFocus})}
        ?disabled=${I(e?void 0:this.disabled)}
        type=${I(e?void 0:`button`)}
        href=${I(e?this.href:void 0)}
        target=${I(e?this.target:void 0)}
        download=${I(e?this.download:void 0)}
        rel=${I(e&&this.target?`noreferrer noopener`:void 0)}
        role=${I(e?void 0:`button`)}
        aria-disabled=${this.disabled?`true`:`false`}
        aria-label="${this.label}"
        tabindex=${this.disabled?`-1`:`0`}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @click=${this.handleClick}
      >
        <sl-icon
          class="icon-button__icon"
          name=${I(this.name)}
          library=${I(this.library)}
          src=${I(this.src)}
          aria-hidden="true"
        ></sl-icon>
      </${t}>
    `}};L.styles=[k,Ve],L.dependencies={"sl-icon":P},D([M(`.icon-button`)],L.prototype,`button`,2),D([j()],L.prototype,`hasFocus`,2),D([A()],L.prototype,`name`,2),D([A()],L.prototype,`library`,2),D([A()],L.prototype,`src`,2),D([A()],L.prototype,`href`,2),D([A()],L.prototype,`target`,2),D([A()],L.prototype,`download`,2),D([A()],L.prototype,`label`,2),D([A({type:Boolean,reflect:!0})],L.prototype,`disabled`,2);var Rt=new Map,zt=new WeakMap;function Bt(e){return e??{keyframes:[],options:{duration:0}}}function Vt(e,t){return t.toLowerCase()===`rtl`?{keyframes:e.rtlKeyframes||e.keyframes,options:e.options}:e}function Ht(e,t){Rt.set(e,Bt(t))}function Ut(e,t,n){let r=zt.get(e);if(r?.[t])return Vt(r[t],n.dir);let i=Rt.get(t);return i?Vt(i,n.dir):{keyframes:[],options:{duration:0}}}function Wt(e,t){return new Promise(n=>{function r(i){i.target===e&&(e.removeEventListener(t,r),n())}e.addEventListener(t,r)})}function Gt(e,t,n){return new Promise(r=>{if(n?.duration===1/0)throw Error(`Promise-based animations must be finite.`);let i=e.animate(t,ut(lt({},n),{duration:Kt()?0:n.duration}));i.addEventListener(`cancel`,r,{once:!0}),i.addEventListener(`finish`,r,{once:!0})})}function Kt(){return window.matchMedia(`(prefers-reduced-motion: reduce)`).matches}function qt(e){return Promise.all(e.getAnimations().map(e=>new Promise(t=>{e.cancel(),requestAnimationFrame(t)})))}function Jt(e,t){return e.map(e=>ut(lt({},e),{height:e.height===`auto`?`${t}px`:e.height}))}var Yt=class{constructor(e,...t){this.slotNames=[],this.handleSlotChange=e=>{let t=e.target;(this.slotNames.includes(`[default]`)&&!t.name||t.name&&this.slotNames.includes(t.name))&&this.host.requestUpdate()},(this.host=e).addController(this),this.slotNames=t}hasDefaultSlot(){return[...this.host.childNodes].some(e=>{if(e.nodeType===e.TEXT_NODE&&e.textContent.trim()!==``)return!0;if(e.nodeType===e.ELEMENT_NODE){let t=e;if(t.tagName.toLowerCase()===`sl-visually-hidden`)return!1;if(!t.hasAttribute(`slot`))return!0}return!1})}hasNamedSlot(e){return this.host.querySelector(`:scope > [slot="${e}"]`)!==null}test(e){return e===`[default]`?this.hasDefaultSlot():this.hasNamedSlot(e)}hostConnected(){this.host.shadowRoot.addEventListener(`slotchange`,this.handleSlotChange)}hostDisconnected(){this.host.shadowRoot.removeEventListener(`slotchange`,this.handleSlotChange)}},Xt=new Set,Zt=new Map,Qt,$t=`ltr`,en=`en`,tn=typeof MutationObserver<`u`&&typeof document<`u`&&document.documentElement!==void 0;if(tn){let e=new MutationObserver(rn);$t=document.documentElement.dir||`ltr`,en=document.documentElement.lang||navigator.language,e.observe(document.documentElement,{attributes:!0,attributeFilter:[`dir`,`lang`]})}function nn(...e){e.map(e=>{let t=e.$code.toLowerCase();Zt.has(t)?Zt.set(t,Object.assign(Object.assign({},Zt.get(t)),e)):Zt.set(t,e),Qt||=e}),rn()}function rn(){tn&&($t=document.documentElement.dir||`ltr`,en=document.documentElement.lang||navigator.language),[...Xt.keys()].map(e=>{typeof e.requestUpdate==`function`&&e.requestUpdate()})}var an=class{constructor(e){this.host=e,this.host.addController(this)}hostConnected(){Xt.add(this.host)}hostDisconnected(){Xt.delete(this.host)}dir(){return`${this.host.dir||$t}`.toLowerCase()}lang(){return`${this.host.lang||en}`.toLowerCase()}getTranslationData(e){let t;try{t=new Intl.Locale(e.replace(/_/g,`-`))}catch{return{locale:void 0,language:``,region:``,primary:void 0,secondary:void 0}}let n=t.language.toLowerCase(),r=t.region?.toLowerCase()??``,i=Zt.get(`${n}-${r}`),a=Zt.get(n);return{locale:t,language:n,region:r,primary:i,secondary:a}}exists(e,t){let{primary:n,secondary:r}=this.getTranslationData(t.lang??this.lang());return t=Object.assign({includeFallback:!1},t),!!(n&&n[e]||r&&r[e]||t.includeFallback&&Qt&&Qt[e])}term(e,...t){let{primary:n,secondary:r}=this.getTranslationData(this.lang()),i;if(n&&n[e])i=n[e];else if(r&&r[e])i=r[e];else if(Qt&&Qt[e])i=Qt[e];else return console.error(`No translation found for: ${String(e)}`),String(e);return typeof i==`function`?i(...t):i}date(e,t){return e=new Date(e),new Intl.DateTimeFormat(this.lang(),t).format(e)}number(e,t){return e=Number(e),isNaN(e)?``:new Intl.NumberFormat(this.lang(),t).format(e)}relativeTime(e,t,n){return new Intl.RelativeTimeFormat(this.lang(),n).format(e,t)}},on={$code:`en`,$name:`English`,$dir:`ltr`,carousel:`Carousel`,clearEntry:`Clear entry`,close:`Close`,copied:`Copied`,copy:`Copy`,currentValue:`Current value`,error:`Error`,goToSlide:(e,t)=>`Go to slide ${e} of ${t}`,hidePassword:`Hide password`,loading:`Loading`,nextSlide:`Next slide`,numOptionsSelected:e=>e===0?`No options selected`:e===1?`1 option selected`:`${e} options selected`,previousSlide:`Previous slide`,progress:`Progress`,remove:`Remove`,resize:`Resize`,scrollToEnd:`Scroll to end`,scrollToStart:`Scroll to start`,selectAColorFromTheScreen:`Select a color from the screen`,showPassword:`Show password`,slideNum:e=>`Slide ${e}`,toggleColorFormat:`Toggle color format`};nn(on);var sn=on,cn=class extends an{};nn(sn);var ln=s`
  :host {
    display: contents;

    /* For better DX, we'll reset the margin here so the base part can inherit it */
    margin: 0;
  }

  .alert {
    position: relative;
    display: flex;
    align-items: stretch;
    background-color: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-top-width: calc(var(--sl-panel-border-width) * 3);
    border-radius: var(--sl-border-radius-medium);
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-normal);
    line-height: 1.6;
    color: var(--sl-color-neutral-700);
    margin: inherit;
    overflow: hidden;
  }

  .alert:not(.alert--has-icon) .alert__icon,
  .alert:not(.alert--closable) .alert__close-button {
    display: none;
  }

  .alert__icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-large);
    padding-inline-start: var(--sl-spacing-large);
  }

  .alert--has-countdown {
    border-bottom: none;
  }

  .alert--primary {
    border-top-color: var(--sl-color-primary-600);
  }

  .alert--primary .alert__icon {
    color: var(--sl-color-primary-600);
  }

  .alert--success {
    border-top-color: var(--sl-color-success-600);
  }

  .alert--success .alert__icon {
    color: var(--sl-color-success-600);
  }

  .alert--neutral {
    border-top-color: var(--sl-color-neutral-600);
  }

  .alert--neutral .alert__icon {
    color: var(--sl-color-neutral-600);
  }

  .alert--warning {
    border-top-color: var(--sl-color-warning-600);
  }

  .alert--warning .alert__icon {
    color: var(--sl-color-warning-600);
  }

  .alert--danger {
    border-top-color: var(--sl-color-danger-600);
  }

  .alert--danger .alert__icon {
    color: var(--sl-color-danger-600);
  }

  .alert__message {
    flex: 1 1 auto;
    display: block;
    padding: var(--sl-spacing-large);
    overflow: hidden;
  }

  .alert__close-button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
    margin-inline-end: var(--sl-spacing-medium);
    align-self: center;
  }

  .alert__countdown {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: calc(var(--sl-panel-border-width) * 3);
    background-color: var(--sl-panel-border-color);
    display: flex;
  }

  .alert__countdown--ltr {
    justify-content: flex-end;
  }

  .alert__countdown .alert__countdown-elapsed {
    height: 100%;
    width: 0;
  }

  .alert--primary .alert__countdown-elapsed {
    background-color: var(--sl-color-primary-600);
  }

  .alert--success .alert__countdown-elapsed {
    background-color: var(--sl-color-success-600);
  }

  .alert--neutral .alert__countdown-elapsed {
    background-color: var(--sl-color-neutral-600);
  }

  .alert--warning .alert__countdown-elapsed {
    background-color: var(--sl-color-warning-600);
  }

  .alert--danger .alert__countdown-elapsed {
    background-color: var(--sl-color-danger-600);
  }

  .alert__timer {
    display: none;
  }
`,R=class t extends N{constructor(){super(...arguments),this.hasSlotController=new Yt(this,`icon`,`suffix`),this.localize=new cn(this),this.open=!1,this.closable=!1,this.variant=`primary`,this.duration=1/0,this.remainingTime=this.duration}static get toastStack(){return this.currentToastStack||=Object.assign(document.createElement(`div`),{className:`sl-toast-stack`}),this.currentToastStack}firstUpdated(){this.base.hidden=!this.open}restartAutoHide(){this.handleCountdownChange(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),this.open&&this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.duration),this.remainingTime=this.duration,this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100))}pauseAutoHide(){var e;(e=this.countdownAnimation)==null||e.pause(),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval)}resumeAutoHide(){var e;this.duration<1/0&&(this.autoHideTimeout=window.setTimeout(()=>this.hide(),this.remainingTime),this.remainingTimeInterval=window.setInterval(()=>{this.remainingTime-=100},100),(e=this.countdownAnimation)==null||e.play())}handleCountdownChange(){if(this.open&&this.duration<1/0&&this.countdown){let{countdownElement:e}=this;this.countdownAnimation=e.animate([{width:`100%`},{width:`0`}],{duration:this.duration,easing:`linear`})}}handleCloseClick(){this.hide()}async handleOpenChange(){if(this.open){this.emit(`sl-show`),this.duration<1/0&&this.restartAutoHide(),await qt(this.base),this.base.hidden=!1;let{keyframes:e,options:t}=Ut(this,`alert.show`,{dir:this.localize.dir()});await Gt(this.base,e,t),this.emit(`sl-after-show`)}else{e(this),this.emit(`sl-hide`),clearTimeout(this.autoHideTimeout),clearInterval(this.remainingTimeInterval),await qt(this.base);let{keyframes:t,options:n}=Ut(this,`alert.hide`,{dir:this.localize.dir()});await Gt(this.base,t,n),this.base.hidden=!0,this.emit(`sl-after-hide`)}}handleDurationChange(){this.restartAutoHide()}async show(){if(!this.open)return this.open=!0,Wt(this,`sl-after-show`)}async hide(){if(this.open)return this.open=!1,Wt(this,`sl-after-hide`)}async toast(){return new Promise(e=>{this.handleCountdownChange(),t.toastStack.parentElement===null&&document.body.append(t.toastStack),t.toastStack.appendChild(this),requestAnimationFrame(()=>{this.clientWidth,this.show()}),this.addEventListener(`sl-after-hide`,()=>{t.toastStack.removeChild(this),e(),t.toastStack.querySelector(`sl-alert`)===null&&t.toastStack.remove()},{once:!0})})}render(){return w`
      <div
        part="base"
        class=${F({alert:!0,"alert--open":this.open,"alert--closable":this.closable,"alert--has-countdown":!!this.countdown,"alert--has-icon":this.hasSlotController.test(`icon`),"alert--primary":this.variant===`primary`,"alert--success":this.variant===`success`,"alert--neutral":this.variant===`neutral`,"alert--warning":this.variant===`warning`,"alert--danger":this.variant===`danger`})}
        role="alert"
        aria-hidden=${this.open?`false`:`true`}
        @mouseenter=${this.pauseAutoHide}
        @mouseleave=${this.resumeAutoHide}
      >
        <div part="icon" class="alert__icon">
          <slot name="icon"></slot>
        </div>

        <div part="message" class="alert__message" aria-live="polite">
          <slot></slot>
        </div>

        ${this.closable?w`
              <sl-icon-button
                part="close-button"
                exportparts="base:close-button__base"
                class="alert__close-button"
                name="x-lg"
                library="system"
                label=${this.localize.term(`close`)}
                @click=${this.handleCloseClick}
              ></sl-icon-button>
            `:``}

        <div role="timer" class="alert__timer">${this.remainingTime}</div>

        ${this.countdown?w`
              <div
                class=${F({alert__countdown:!0,"alert__countdown--ltr":this.countdown===`ltr`})}
              >
                <div class="alert__countdown-elapsed"></div>
              </div>
            `:``}
      </div>
    `}};R.styles=[k,ln],R.dependencies={"sl-icon-button":L},D([M(`[part~="base"]`)],R.prototype,`base`,2),D([M(`.alert__countdown-elapsed`)],R.prototype,`countdownElement`,2),D([A({type:Boolean,reflect:!0})],R.prototype,`open`,2),D([A({type:Boolean,reflect:!0})],R.prototype,`closable`,2),D([A({reflect:!0})],R.prototype,`variant`,2),D([A({type:Number})],R.prototype,`duration`,2),D([A({type:String,reflect:!0})],R.prototype,`countdown`,2),D([j()],R.prototype,`remainingTime`,2),D([O(`open`,{waitUntilFirstUpdate:!0})],R.prototype,`handleOpenChange`,1),D([O(`duration`)],R.prototype,`handleDurationChange`,1);var un=R;Ht(`alert.show`,{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:`ease`}}),Ht(`alert.hide`,{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:`ease`}}),un.define(`sl-alert`);var dn=s`
  :host {
    display: inline-flex;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: max(12px, 0.75em);
    font-weight: var(--sl-font-weight-semibold);
    letter-spacing: var(--sl-letter-spacing-normal);
    line-height: 1;
    border-radius: var(--sl-border-radius-small);
    border: solid 1px var(--sl-color-neutral-0);
    white-space: nowrap;
    padding: 0.35em 0.6em;
    user-select: none;
    -webkit-user-select: none;
    cursor: inherit;
  }

  /* Variant modifiers */
  .badge--primary {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--success {
    background-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--neutral {
    background-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--warning {
    background-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  .badge--danger {
    background-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  /* Pill modifier */
  .badge--pill {
    border-radius: var(--sl-border-radius-pill);
  }

  /* Pulse modifier */
  .badge--pulse {
    animation: pulse 1.5s infinite;
  }

  .badge--pulse.badge--primary {
    --pulse-color: var(--sl-color-primary-600);
  }

  .badge--pulse.badge--success {
    --pulse-color: var(--sl-color-success-600);
  }

  .badge--pulse.badge--neutral {
    --pulse-color: var(--sl-color-neutral-600);
  }

  .badge--pulse.badge--warning {
    --pulse-color: var(--sl-color-warning-600);
  }

  .badge--pulse.badge--danger {
    --pulse-color: var(--sl-color-danger-600);
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 var(--pulse-color);
    }
    70% {
      box-shadow: 0 0 0 0.5rem transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
`,fn=class extends N{constructor(){super(...arguments),this.variant=`primary`,this.pill=!1,this.pulse=!1}render(){return w`
      <span
        part="base"
        class=${F({badge:!0,"badge--primary":this.variant===`primary`,"badge--success":this.variant===`success`,"badge--neutral":this.variant===`neutral`,"badge--warning":this.variant===`warning`,"badge--danger":this.variant===`danger`,"badge--pill":this.pill,"badge--pulse":this.pulse})}
        role="status"
      >
        <slot></slot>
      </span>
    `}};fn.styles=[k,dn],D([A({reflect:!0})],fn.prototype,`variant`,2),D([A({type:Boolean,reflect:!0})],fn.prototype,`pill`,2),D([A({type:Boolean,reflect:!0})],fn.prototype,`pulse`,2),fn.define(`sl-badge`);var pn=s`
  :host {
    --track-width: 2px;
    --track-color: rgb(128 128 128 / 25%);
    --indicator-color: var(--sl-color-primary-600);
    --speed: 2s;

    display: inline-flex;
    width: 1em;
    height: 1em;
    flex: none;
  }

  .spinner {
    flex: 1 1 auto;
    height: 100%;
    width: 100%;
  }

  .spinner__track,
  .spinner__indicator {
    fill: none;
    stroke-width: var(--track-width);
    r: calc(0.5em - var(--track-width) / 2);
    cx: 0.5em;
    cy: 0.5em;
    transform-origin: 50% 50%;
  }

  .spinner__track {
    stroke: var(--track-color);
    transform-origin: 0% 0%;
  }

  .spinner__indicator {
    stroke: var(--indicator-color);
    stroke-linecap: round;
    stroke-dasharray: 150% 75%;
    animation: spin var(--speed) linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
      stroke-dasharray: 0.05em, 3em;
    }

    50% {
      transform: rotate(450deg);
      stroke-dasharray: 1.375em, 1.375em;
    }

    100% {
      transform: rotate(1080deg);
      stroke-dasharray: 0.05em, 3em;
    }
  }
`,mn=class extends N{constructor(){super(...arguments),this.localize=new cn(this)}render(){return w`
      <svg part="base" class="spinner" role="progressbar" aria-label=${this.localize.term(`loading`)}>
        <circle class="spinner__track"></circle>
        <circle class="spinner__indicator"></circle>
      </svg>
    `}};mn.styles=[k,pn];var hn=new WeakMap,gn=new WeakMap,_n=new WeakMap,vn=new WeakSet,yn=new WeakMap,bn=class{constructor(e,t){this.handleFormData=e=>{let t=this.options.disabled(this.host),n=this.options.name(this.host),r=this.options.value(this.host),i=this.host.tagName.toLowerCase()===`sl-button`;this.host.isConnected&&!t&&!i&&typeof n==`string`&&n.length>0&&r!==void 0&&(Array.isArray(r)?r.forEach(t=>{e.formData.append(n,t.toString())}):e.formData.append(n,r.toString()))},this.handleFormSubmit=e=>{var t;let n=this.options.disabled(this.host),r=this.options.reportValidity;this.form&&!this.form.noValidate&&((t=hn.get(this.form))==null||t.forEach(e=>{this.setUserInteracted(e,!0)})),this.form&&!this.form.noValidate&&!n&&!r(this.host)&&(e.preventDefault(),e.stopImmediatePropagation())},this.handleFormReset=()=>{this.options.setValue(this.host,this.options.defaultValue(this.host)),this.setUserInteracted(this.host,!1),yn.set(this.host,[])},this.handleInteraction=e=>{let t=yn.get(this.host);t.includes(e.type)||t.push(e.type),t.length===this.options.assumeInteractionOn.length&&this.setUserInteracted(this.host,!0)},this.checkFormValidity=()=>{if(this.form&&!this.form.noValidate){let e=this.form.querySelectorAll(`*`);for(let t of e)if(typeof t.checkValidity==`function`&&!t.checkValidity())return!1}return!0},this.reportFormValidity=()=>{if(this.form&&!this.form.noValidate){let e=this.form.querySelectorAll(`*`);for(let t of e)if(typeof t.reportValidity==`function`&&!t.reportValidity())return!1}return!0},(this.host=e).addController(this),this.options=lt({form:e=>{let t=e.form;if(t){let n=e.getRootNode().querySelector(`#${t}`);if(n)return n}return e.closest(`form`)},name:e=>e.name,value:e=>e.value,defaultValue:e=>e.defaultValue,disabled:e=>e.disabled??!1,reportValidity:e=>typeof e.reportValidity==`function`?e.reportValidity():!0,checkValidity:e=>typeof e.checkValidity==`function`?e.checkValidity():!0,setValue:(e,t)=>e.value=t,assumeInteractionOn:[`sl-input`]},t)}hostConnected(){let e=this.options.form(this.host);e&&this.attachForm(e),yn.set(this.host,[]),this.options.assumeInteractionOn.forEach(e=>{this.host.addEventListener(e,this.handleInteraction)})}hostDisconnected(){this.detachForm(),yn.delete(this.host),this.options.assumeInteractionOn.forEach(e=>{this.host.removeEventListener(e,this.handleInteraction)})}hostUpdated(){let e=this.options.form(this.host);e||this.detachForm(),e&&this.form!==e&&(this.detachForm(),this.attachForm(e)),this.host.hasUpdated&&this.setValidity(this.host.validity.valid)}attachForm(e){e?(this.form=e,hn.has(this.form)?hn.get(this.form).add(this.host):hn.set(this.form,new Set([this.host])),this.form.addEventListener(`formdata`,this.handleFormData),this.form.addEventListener(`submit`,this.handleFormSubmit),this.form.addEventListener(`reset`,this.handleFormReset),gn.has(this.form)||(gn.set(this.form,this.form.reportValidity),this.form.reportValidity=()=>this.reportFormValidity()),_n.has(this.form)||(_n.set(this.form,this.form.checkValidity),this.form.checkValidity=()=>this.checkFormValidity())):this.form=void 0}detachForm(){if(!this.form)return;let e=hn.get(this.form);e&&(e.delete(this.host),e.size<=0&&(this.form.removeEventListener(`formdata`,this.handleFormData),this.form.removeEventListener(`submit`,this.handleFormSubmit),this.form.removeEventListener(`reset`,this.handleFormReset),gn.has(this.form)&&(this.form.reportValidity=gn.get(this.form),gn.delete(this.form)),_n.has(this.form)&&(this.form.checkValidity=_n.get(this.form),_n.delete(this.form)),this.form=void 0))}setUserInteracted(e,t){t?vn.add(e):vn.delete(e),e.requestUpdate()}doAction(e,t){if(this.form){let n=document.createElement(`button`);n.type=e,n.style.position=`absolute`,n.style.width=`0`,n.style.height=`0`,n.style.clipPath=`inset(50%)`,n.style.overflow=`hidden`,n.style.whiteSpace=`nowrap`,t&&(n.name=t.name,n.value=t.value,[`formaction`,`formenctype`,`formmethod`,`formnovalidate`,`formtarget`].forEach(e=>{t.hasAttribute(e)&&n.setAttribute(e,t.getAttribute(e))})),this.form.append(n),n.click(),n.remove()}}getForm(){return this.form??null}reset(e){this.doAction(`reset`,e)}submit(e){this.doAction(`submit`,e)}setValidity(e){let t=this.host,n=!!vn.has(t),r=!!t.required;t.toggleAttribute(`data-required`,r),t.toggleAttribute(`data-optional`,!r),t.toggleAttribute(`data-invalid`,!e),t.toggleAttribute(`data-valid`,e),t.toggleAttribute(`data-user-invalid`,!e&&n),t.toggleAttribute(`data-user-valid`,e&&n)}updateValidity(){let e=this.host;this.setValidity(e.validity.valid)}emitInvalidEvent(e){let t=new CustomEvent(`sl-invalid`,{bubbles:!1,composed:!1,cancelable:!0,detail:{}});e||t.preventDefault(),this.host.dispatchEvent(t)||e?.preventDefault()}},xn=Object.freeze({badInput:!1,customError:!1,patternMismatch:!1,rangeOverflow:!1,rangeUnderflow:!1,stepMismatch:!1,tooLong:!1,tooShort:!1,typeMismatch:!1,valid:!0,valueMissing:!1});Object.freeze(ut(lt({},xn),{valid:!1,valueMissing:!0})),Object.freeze(ut(lt({},xn),{valid:!1,customError:!0}));var Sn=s`
  :host {
    display: inline-block;
    position: relative;
    width: auto;
    cursor: pointer;
  }

  .button {
    display: inline-flex;
    align-items: stretch;
    justify-content: center;
    width: 100%;
    border-style: solid;
    border-width: var(--sl-input-border-width);
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-font-weight-semibold);
    text-decoration: none;
    user-select: none;
    -webkit-user-select: none;
    white-space: nowrap;
    vertical-align: middle;
    padding: 0;
    transition:
      var(--sl-transition-x-fast) background-color,
      var(--sl-transition-x-fast) color,
      var(--sl-transition-x-fast) border,
      var(--sl-transition-x-fast) box-shadow;
    cursor: inherit;
  }

  .button::-moz-focus-inner {
    border: 0;
  }

  .button:focus {
    outline: none;
  }

  .button:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* When disabled, prevent mouse events from bubbling up from children */
  .button--disabled * {
    pointer-events: none;
  }

  .button__prefix,
  .button__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .button__label {
    display: inline-block;
  }

  .button__label::slotted(sl-icon) {
    vertical-align: -2px;
  }

  /*
   * Standard buttons
   */

  /* Default */
  .button--standard.button--default {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-input-border-color);
    color: var(--sl-color-neutral-700);
  }

  .button--standard.button--default:hover:not(.button--disabled) {
    background-color: var(--sl-color-primary-50);
    border-color: var(--sl-color-primary-300);
    color: var(--sl-color-primary-700);
  }

  .button--standard.button--default:active:not(.button--disabled) {
    background-color: var(--sl-color-primary-100);
    border-color: var(--sl-color-primary-400);
    color: var(--sl-color-primary-700);
  }

  /* Primary */
  .button--standard.button--primary {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--primary:hover:not(.button--disabled) {
    background-color: var(--sl-color-primary-500);
    border-color: var(--sl-color-primary-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--primary:active:not(.button--disabled) {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  /* Success */
  .button--standard.button--success {
    background-color: var(--sl-color-success-600);
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--success:hover:not(.button--disabled) {
    background-color: var(--sl-color-success-500);
    border-color: var(--sl-color-success-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--success:active:not(.button--disabled) {
    background-color: var(--sl-color-success-600);
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  /* Neutral */
  .button--standard.button--neutral {
    background-color: var(--sl-color-neutral-600);
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--neutral:hover:not(.button--disabled) {
    background-color: var(--sl-color-neutral-500);
    border-color: var(--sl-color-neutral-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--neutral:active:not(.button--disabled) {
    background-color: var(--sl-color-neutral-600);
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  /* Warning */
  .button--standard.button--warning {
    background-color: var(--sl-color-warning-600);
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }
  .button--standard.button--warning:hover:not(.button--disabled) {
    background-color: var(--sl-color-warning-500);
    border-color: var(--sl-color-warning-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--warning:active:not(.button--disabled) {
    background-color: var(--sl-color-warning-600);
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  /* Danger */
  .button--standard.button--danger {
    background-color: var(--sl-color-danger-600);
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--danger:hover:not(.button--disabled) {
    background-color: var(--sl-color-danger-500);
    border-color: var(--sl-color-danger-500);
    color: var(--sl-color-neutral-0);
  }

  .button--standard.button--danger:active:not(.button--disabled) {
    background-color: var(--sl-color-danger-600);
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  /*
   * Outline buttons
   */

  .button--outline {
    background: none;
    border: solid 1px;
  }

  /* Default */
  .button--outline.button--default {
    border-color: var(--sl-input-border-color);
    color: var(--sl-color-neutral-700);
  }

  .button--outline.button--default:hover:not(.button--disabled),
  .button--outline.button--default.button--checked:not(.button--disabled) {
    border-color: var(--sl-color-primary-600);
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--default:active:not(.button--disabled) {
    border-color: var(--sl-color-primary-700);
    background-color: var(--sl-color-primary-700);
    color: var(--sl-color-neutral-0);
  }

  /* Primary */
  .button--outline.button--primary {
    border-color: var(--sl-color-primary-600);
    color: var(--sl-color-primary-600);
  }

  .button--outline.button--primary:hover:not(.button--disabled),
  .button--outline.button--primary.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--primary:active:not(.button--disabled) {
    border-color: var(--sl-color-primary-700);
    background-color: var(--sl-color-primary-700);
    color: var(--sl-color-neutral-0);
  }

  /* Success */
  .button--outline.button--success {
    border-color: var(--sl-color-success-600);
    color: var(--sl-color-success-600);
  }

  .button--outline.button--success:hover:not(.button--disabled),
  .button--outline.button--success.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-success-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--success:active:not(.button--disabled) {
    border-color: var(--sl-color-success-700);
    background-color: var(--sl-color-success-700);
    color: var(--sl-color-neutral-0);
  }

  /* Neutral */
  .button--outline.button--neutral {
    border-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-600);
  }

  .button--outline.button--neutral:hover:not(.button--disabled),
  .button--outline.button--neutral.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-neutral-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--neutral:active:not(.button--disabled) {
    border-color: var(--sl-color-neutral-700);
    background-color: var(--sl-color-neutral-700);
    color: var(--sl-color-neutral-0);
  }

  /* Warning */
  .button--outline.button--warning {
    border-color: var(--sl-color-warning-600);
    color: var(--sl-color-warning-600);
  }

  .button--outline.button--warning:hover:not(.button--disabled),
  .button--outline.button--warning.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-warning-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--warning:active:not(.button--disabled) {
    border-color: var(--sl-color-warning-700);
    background-color: var(--sl-color-warning-700);
    color: var(--sl-color-neutral-0);
  }

  /* Danger */
  .button--outline.button--danger {
    border-color: var(--sl-color-danger-600);
    color: var(--sl-color-danger-600);
  }

  .button--outline.button--danger:hover:not(.button--disabled),
  .button--outline.button--danger.button--checked:not(.button--disabled) {
    background-color: var(--sl-color-danger-600);
    color: var(--sl-color-neutral-0);
  }

  .button--outline.button--danger:active:not(.button--disabled) {
    border-color: var(--sl-color-danger-700);
    background-color: var(--sl-color-danger-700);
    color: var(--sl-color-neutral-0);
  }

  @media (forced-colors: active) {
    .button.button--outline.button--checked:not(.button--disabled) {
      outline: solid 2px transparent;
    }
  }

  /*
   * Text buttons
   */

  .button--text {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-600);
  }

  .button--text:hover:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-500);
  }

  .button--text:focus-visible:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-500);
  }

  .button--text:active:not(.button--disabled) {
    background-color: transparent;
    border-color: transparent;
    color: var(--sl-color-primary-700);
  }

  /*
   * Size modifiers
   */

  .button--small {
    height: auto;
    min-height: var(--sl-input-height-small);
    font-size: var(--sl-button-font-size-small);
    line-height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-small);
  }

  .button--medium {
    height: auto;
    min-height: var(--sl-input-height-medium);
    font-size: var(--sl-button-font-size-medium);
    line-height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-medium);
  }

  .button--large {
    height: auto;
    min-height: var(--sl-input-height-large);
    font-size: var(--sl-button-font-size-large);
    line-height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-large);
  }

  /*
   * Pill modifier
   */

  .button--pill.button--small {
    border-radius: var(--sl-input-height-small);
  }

  .button--pill.button--medium {
    border-radius: var(--sl-input-height-medium);
  }

  .button--pill.button--large {
    border-radius: var(--sl-input-height-large);
  }

  /*
   * Circle modifier
   */

  .button--circle {
    padding-left: 0;
    padding-right: 0;
  }

  .button--circle.button--small {
    width: var(--sl-input-height-small);
    border-radius: 50%;
  }

  .button--circle.button--medium {
    width: var(--sl-input-height-medium);
    border-radius: 50%;
  }

  .button--circle.button--large {
    width: var(--sl-input-height-large);
    border-radius: 50%;
  }

  .button--circle .button__prefix,
  .button--circle .button__suffix,
  .button--circle .button__caret {
    display: none;
  }

  /*
   * Caret modifier
   */

  .button--caret .button__suffix {
    display: none;
  }

  .button--caret .button__caret {
    height: auto;
  }

  /*
   * Loading modifier
   */

  .button--loading {
    position: relative;
    cursor: wait;
  }

  .button--loading .button__prefix,
  .button--loading .button__label,
  .button--loading .button__suffix,
  .button--loading .button__caret {
    visibility: hidden;
  }

  .button--loading sl-spinner {
    --indicator-color: currentColor;
    position: absolute;
    font-size: 1em;
    height: 1em;
    width: 1em;
    top: calc(50% - 0.5em);
    left: calc(50% - 0.5em);
  }

  /*
   * Badges
   */

  .button ::slotted(sl-badge) {
    position: absolute;
    top: 0;
    right: 0;
    translate: 50% -50%;
    pointer-events: none;
  }

  .button--rtl ::slotted(sl-badge) {
    right: auto;
    left: 0;
    translate: -50% -50%;
  }

  /*
   * Button spacing
   */

  .button--has-label.button--small .button__label {
    padding: 0 var(--sl-spacing-small);
  }

  .button--has-label.button--medium .button__label {
    padding: 0 var(--sl-spacing-medium);
  }

  .button--has-label.button--large .button__label {
    padding: 0 var(--sl-spacing-large);
  }

  .button--has-prefix.button--small {
    padding-inline-start: var(--sl-spacing-x-small);
  }

  .button--has-prefix.button--small .button__label {
    padding-inline-start: var(--sl-spacing-x-small);
  }

  .button--has-prefix.button--medium {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--medium .button__label {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--large {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-prefix.button--large .button__label {
    padding-inline-start: var(--sl-spacing-small);
  }

  .button--has-suffix.button--small,
  .button--caret.button--small {
    padding-inline-end: var(--sl-spacing-x-small);
  }

  .button--has-suffix.button--small .button__label,
  .button--caret.button--small .button__label {
    padding-inline-end: var(--sl-spacing-x-small);
  }

  .button--has-suffix.button--medium,
  .button--caret.button--medium {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--medium .button__label,
  .button--caret.button--medium .button__label {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--large,
  .button--caret.button--large {
    padding-inline-end: var(--sl-spacing-small);
  }

  .button--has-suffix.button--large .button__label,
  .button--caret.button--large .button__label {
    padding-inline-end: var(--sl-spacing-small);
  }

  /*
   * Button groups support a variety of button types (e.g. buttons with tooltips, buttons as dropdown triggers, etc.).
   * This means buttons aren't always direct descendants of the button group, thus we can't target them with the
   * ::slotted selector. To work around this, the button group component does some magic to add these special classes to
   * buttons and we style them here instead.
   */

  :host([data-sl-button-group__button--first]:not([data-sl-button-group__button--last])) .button {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  :host([data-sl-button-group__button--inner]) .button {
    border-radius: 0;
  }

  :host([data-sl-button-group__button--last]:not([data-sl-button-group__button--first])) .button {
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }

  /* All except the first */
  :host([data-sl-button-group__button]:not([data-sl-button-group__button--first])) {
    margin-inline-start: calc(-1 * var(--sl-input-border-width));
  }

  /* Add a visual separator between solid buttons */
  :host(
      [data-sl-button-group__button]:not(
          [data-sl-button-group__button--first],
          [data-sl-button-group__button--radio],
          [variant='default']
        ):not(:hover)
    )
    .button:after {
    content: '';
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    bottom: 0;
    border-left: solid 1px rgb(128 128 128 / 33%);
    mix-blend-mode: multiply;
  }

  /* Bump hovered, focused, and checked buttons up so their focus ring isn't clipped */
  :host([data-sl-button-group__button--hover]) {
    z-index: 1;
  }

  /* Focus and checked are always on top */
  :host([data-sl-button-group__button--focus]),
  :host([data-sl-button-group__button][checked]) {
    z-index: 2;
  }
`,z=class extends N{constructor(){super(...arguments),this.formControlController=new bn(this,{assumeInteractionOn:[`click`]}),this.hasSlotController=new Yt(this,`[default]`,`prefix`,`suffix`),this.localize=new cn(this),this.hasFocus=!1,this.invalid=!1,this.title=``,this.variant=`default`,this.size=`medium`,this.caret=!1,this.disabled=!1,this.loading=!1,this.outline=!1,this.pill=!1,this.circle=!1,this.type=`button`,this.name=``,this.value=``,this.href=``,this.rel=`noreferrer noopener`}get validity(){return this.isButton()?this.button.validity:xn}get validationMessage(){return this.isButton()?this.button.validationMessage:``}firstUpdated(){this.isButton()&&this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit(`sl-blur`)}handleFocus(){this.hasFocus=!0,this.emit(`sl-focus`)}handleClick(){this.type===`submit`&&this.formControlController.submit(this),this.type===`reset`&&this.formControlController.reset(this)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}isButton(){return!this.href}isLink(){return!!this.href}handleDisabledChange(){this.isButton()&&this.formControlController.setValidity(this.disabled)}click(){this.button.click()}focus(e){this.button.focus(e)}blur(){this.button.blur()}checkValidity(){return this.isButton()?this.button.checkValidity():!0}getForm(){return this.formControlController.getForm()}reportValidity(){return this.isButton()?this.button.reportValidity():!0}setCustomValidity(e){this.isButton()&&(this.button.setCustomValidity(e),this.formControlController.updateValidity())}render(){let e=this.isLink(),t=e?Ft`a`:Ft`button`;return Lt`
      <${t}
        part="base"
        class=${F({button:!0,"button--default":this.variant===`default`,"button--primary":this.variant===`primary`,"button--success":this.variant===`success`,"button--neutral":this.variant===`neutral`,"button--warning":this.variant===`warning`,"button--danger":this.variant===`danger`,"button--text":this.variant===`text`,"button--small":this.size===`small`,"button--medium":this.size===`medium`,"button--large":this.size===`large`,"button--caret":this.caret,"button--circle":this.circle,"button--disabled":this.disabled,"button--focused":this.hasFocus,"button--loading":this.loading,"button--standard":!this.outline,"button--outline":this.outline,"button--pill":this.pill,"button--rtl":this.localize.dir()===`rtl`,"button--has-label":this.hasSlotController.test(`[default]`),"button--has-prefix":this.hasSlotController.test(`prefix`),"button--has-suffix":this.hasSlotController.test(`suffix`)})}
        ?disabled=${I(e?void 0:this.disabled)}
        type=${I(e?void 0:this.type)}
        title=${this.title}
        name=${I(e?void 0:this.name)}
        value=${I(e?void 0:this.value)}
        href=${I(e&&!this.disabled?this.href:void 0)}
        target=${I(e?this.target:void 0)}
        download=${I(e?this.download:void 0)}
        rel=${I(e?this.rel:void 0)}
        role=${I(e?void 0:`button`)}
        aria-disabled=${this.disabled?`true`:`false`}
        tabindex=${this.disabled?`-1`:`0`}
        @blur=${this.handleBlur}
        @focus=${this.handleFocus}
        @invalid=${this.isButton()?this.handleInvalid:null}
        @click=${this.handleClick}
      >
        <slot name="prefix" part="prefix" class="button__prefix"></slot>
        <slot part="label" class="button__label"></slot>
        <slot name="suffix" part="suffix" class="button__suffix"></slot>
        ${this.caret?Lt` <sl-icon part="caret" class="button__caret" library="system" name="caret"></sl-icon> `:``}
        ${this.loading?Lt`<sl-spinner part="spinner"></sl-spinner>`:``}
      </${t}>
    `}};z.styles=[k,Sn],z.dependencies={"sl-icon":P,"sl-spinner":mn},D([M(`.button`)],z.prototype,`button`,2),D([j()],z.prototype,`hasFocus`,2),D([j()],z.prototype,`invalid`,2),D([A()],z.prototype,`title`,2),D([A({reflect:!0})],z.prototype,`variant`,2),D([A({reflect:!0})],z.prototype,`size`,2),D([A({type:Boolean,reflect:!0})],z.prototype,`caret`,2),D([A({type:Boolean,reflect:!0})],z.prototype,`disabled`,2),D([A({type:Boolean,reflect:!0})],z.prototype,`loading`,2),D([A({type:Boolean,reflect:!0})],z.prototype,`outline`,2),D([A({type:Boolean,reflect:!0})],z.prototype,`pill`,2),D([A({type:Boolean,reflect:!0})],z.prototype,`circle`,2),D([A()],z.prototype,`type`,2),D([A()],z.prototype,`name`,2),D([A()],z.prototype,`value`,2),D([A()],z.prototype,`href`,2),D([A()],z.prototype,`target`,2),D([A()],z.prototype,`rel`,2),D([A()],z.prototype,`download`,2),D([A()],z.prototype,`form`,2),D([A({attribute:`formaction`})],z.prototype,`formAction`,2),D([A({attribute:`formenctype`})],z.prototype,`formEnctype`,2),D([A({attribute:`formmethod`})],z.prototype,`formMethod`,2),D([A({attribute:`formnovalidate`,type:Boolean})],z.prototype,`formNoValidate`,2),D([A({attribute:`formtarget`})],z.prototype,`formTarget`,2),D([O(`disabled`,{waitUntilFirstUpdate:!0})],z.prototype,`handleDisabledChange`,1),z.define(`sl-button`);var Cn=s`
  :host {
    display: block;
  }

  .details {
    border: solid 1px var(--sl-color-neutral-200);
    border-radius: var(--sl-border-radius-medium);
    background-color: var(--sl-color-neutral-0);
    overflow-anchor: none;
  }

  .details--disabled {
    opacity: 0.5;
  }

  .details__header {
    display: flex;
    align-items: center;
    border-radius: inherit;
    padding: var(--sl-spacing-medium);
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
  }

  .details__header::-webkit-details-marker {
    display: none;
  }

  .details__header:focus {
    outline: none;
  }

  .details__header:focus-visible {
    outline: var(--sl-focus-ring);
    outline-offset: calc(1px + var(--sl-focus-ring-offset));
  }

  .details--disabled .details__header {
    cursor: not-allowed;
  }

  .details--disabled .details__header:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .details__summary {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
  }

  .details__summary-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    transition: var(--sl-transition-medium) rotate ease;
  }

  .details--open .details__summary-icon {
    rotate: 90deg;
  }

  .details--open.details--rtl .details__summary-icon {
    rotate: -90deg;
  }

  .details--open slot[name='expand-icon'],
  .details:not(.details--open) slot[name='collapse-icon'] {
    display: none;
  }

  .details__body {
    overflow: hidden;
  }

  .details__content {
    display: block;
    padding: var(--sl-spacing-medium);
  }
`,wn=class extends N{constructor(){super(...arguments),this.localize=new cn(this),this.open=!1,this.disabled=!1}firstUpdated(){this.body.style.height=this.open?`auto`:`0`,this.open&&(this.details.open=!0),this.detailsObserver=new MutationObserver(e=>{for(let t of e)t.type===`attributes`&&t.attributeName===`open`&&(this.details.open?this.show():this.hide())}),this.detailsObserver.observe(this.details,{attributes:!0})}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this.detailsObserver)==null||e.disconnect()}handleSummaryClick(e){e.preventDefault(),this.disabled||(this.open?this.hide():this.show(),this.header.focus())}handleSummaryKeyDown(e){(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),this.open?this.hide():this.show()),(e.key===`ArrowUp`||e.key===`ArrowLeft`)&&(e.preventDefault(),this.hide()),(e.key===`ArrowDown`||e.key===`ArrowRight`)&&(e.preventDefault(),this.show())}async handleOpenChange(){if(this.open){if(this.details.open=!0,this.emit(`sl-show`,{cancelable:!0}).defaultPrevented){this.open=!1,this.details.open=!1;return}await qt(this.body);let{keyframes:e,options:t}=Ut(this,`details.show`,{dir:this.localize.dir()});await Gt(this.body,Jt(e,this.body.scrollHeight),t),this.body.style.height=`auto`,this.emit(`sl-after-show`)}else{if(this.emit(`sl-hide`,{cancelable:!0}).defaultPrevented){this.details.open=!0,this.open=!0;return}await qt(this.body);let{keyframes:e,options:t}=Ut(this,`details.hide`,{dir:this.localize.dir()});await Gt(this.body,Jt(e,this.body.scrollHeight),t),this.body.style.height=`auto`,this.details.open=!1,this.emit(`sl-after-hide`)}}async show(){if(!(this.open||this.disabled))return this.open=!0,Wt(this,`sl-after-show`)}async hide(){if(!(!this.open||this.disabled))return this.open=!1,Wt(this,`sl-after-hide`)}render(){let e=this.localize.dir()===`rtl`;return w`
      <details
        part="base"
        class=${F({details:!0,"details--open":this.open,"details--disabled":this.disabled,"details--rtl":e})}
      >
        <summary
          part="header"
          id="header"
          class="details__header"
          role="button"
          aria-expanded=${this.open?`true`:`false`}
          aria-controls="content"
          aria-disabled=${this.disabled?`true`:`false`}
          tabindex=${this.disabled?`-1`:`0`}
          @click=${this.handleSummaryClick}
          @keydown=${this.handleSummaryKeyDown}
        >
          <slot name="summary" part="summary" class="details__summary">${this.summary}</slot>

          <span part="summary-icon" class="details__summary-icon">
            <slot name="expand-icon">
              <sl-icon library="system" name=${e?`chevron-left`:`chevron-right`}></sl-icon>
            </slot>
            <slot name="collapse-icon">
              <sl-icon library="system" name=${e?`chevron-left`:`chevron-right`}></sl-icon>
            </slot>
          </span>
        </summary>

        <div class="details__body" role="region" aria-labelledby="header">
          <slot part="content" id="content" class="details__content"></slot>
        </div>
      </details>
    `}};wn.styles=[k,Cn],wn.dependencies={"sl-icon":P},D([M(`.details`)],wn.prototype,`details`,2),D([M(`.details__header`)],wn.prototype,`header`,2),D([M(`.details__body`)],wn.prototype,`body`,2),D([M(`.details__expand-icon-slot`)],wn.prototype,`expandIconSlot`,2),D([A({type:Boolean,reflect:!0})],wn.prototype,`open`,2),D([A()],wn.prototype,`summary`,2),D([A({type:Boolean,reflect:!0})],wn.prototype,`disabled`,2),D([O(`open`,{waitUntilFirstUpdate:!0})],wn.prototype,`handleOpenChange`,1),Ht(`details.show`,{keyframes:[{height:`0`,opacity:`0`},{height:`auto`,opacity:`1`}],options:{duration:250,easing:`linear`}}),Ht(`details.hide`,{keyframes:[{height:`auto`,opacity:`1`},{height:`0`,opacity:`0`}],options:{duration:250,easing:`linear`}}),wn.define(`sl-details`);function*Tn(e=document.activeElement){e!=null&&(yield e,`shadowRoot`in e&&e.shadowRoot&&e.shadowRoot.mode!==`closed`&&(yield*gt(Tn(e.shadowRoot.activeElement))))}function En(){return[...Tn()].pop()}var Dn=new WeakMap;function On(e){let t=Dn.get(e);return t||(t=window.getComputedStyle(e,null),Dn.set(e,t)),t}function kn(e){if(typeof e.checkVisibility==`function`)return e.checkVisibility({checkOpacity:!1,checkVisibilityCSS:!0});let t=On(e);return t.visibility!==`hidden`&&t.display!==`none`}function An(e){let{overflowY:t,overflowX:n}=On(e);return t===`scroll`||n===`scroll`?!0:t!==`auto`||n!==`auto`?!1:e.scrollHeight>e.clientHeight&&t===`auto`||e.scrollWidth>e.clientWidth&&n===`auto`}function jn(e){let t=e.tagName.toLowerCase(),n=Number(e.getAttribute(`tabindex`));if(e.hasAttribute(`tabindex`)&&(isNaN(n)||n<=-1)||e.hasAttribute(`disabled`)||e.closest(`[inert]`))return!1;if(t===`input`&&e.getAttribute(`type`)===`radio`){let t=e.getRootNode(),n=`input[type='radio'][name="${e.getAttribute(`name`)}"]`,r=t.querySelector(`${n}:checked`);return r?r===e:t.querySelector(n)===e}return kn(e)?(t===`audio`||t===`video`)&&e.hasAttribute(`controls`)||e.hasAttribute(`tabindex`)||e.hasAttribute(`contenteditable`)&&e.getAttribute(`contenteditable`)!==`false`||[`button`,`input`,`select`,`textarea`,`a`,`audio`,`video`,`summary`,`iframe`].includes(t)?!0:An(e):!1}function Mn(e,t){return e.getRootNode({composed:!0})?.host!==t}function Nn(e){let t=new WeakMap,n=[];function r(i){if(i instanceof Element){if(i.hasAttribute(`inert`)||i.closest(`[inert]`)||t.has(i))return;t.set(i,!0),!n.includes(i)&&jn(i)&&n.push(i),i instanceof HTMLSlotElement&&Mn(i,e)&&i.assignedElements({flatten:!0}).forEach(e=>{r(e)}),i.shadowRoot!==null&&i.shadowRoot.mode===`open`&&r(i.shadowRoot)}for(let e of i.children)r(e)}return r(e),n.sort((e,t)=>{let n=Number(e.getAttribute(`tabindex`))||0;return(Number(t.getAttribute(`tabindex`))||0)-n})}var Pn=[],Fn=class{constructor(e){this.tabDirection=`forward`,this.handleFocusIn=()=>{this.isActive()&&this.checkFocus()},this.handleKeyDown=e=>{var t;if(e.key!==`Tab`||this.isExternalActivated||!this.isActive())return;let n=En();if(this.previousFocus=n,this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus))return;e.shiftKey?this.tabDirection=`backward`:this.tabDirection=`forward`;let r=Nn(this.element),i=r.findIndex(e=>e===n);this.previousFocus=this.currentFocus;let a=this.tabDirection===`forward`?1:-1;for(;;){i+a>=r.length?i=0:i+a<0?i=r.length-1:i+=a,this.previousFocus=this.currentFocus;let n=r[i];if(this.tabDirection===`backward`&&this.previousFocus&&this.possiblyHasTabbableChildren(this.previousFocus)||n&&this.possiblyHasTabbableChildren(n))return;e.preventDefault(),this.currentFocus=n,(t=this.currentFocus)==null||t.focus({preventScroll:!1});let o=[...Tn()];if(o.includes(this.currentFocus)||!o.includes(this.previousFocus))break}setTimeout(()=>this.checkFocus())},this.handleKeyUp=()=>{this.tabDirection=`forward`},this.element=e,this.elementsWithTabbableControls=[`iframe`]}activate(){Pn.push(this.element),document.addEventListener(`focusin`,this.handleFocusIn),document.addEventListener(`keydown`,this.handleKeyDown),document.addEventListener(`keyup`,this.handleKeyUp)}deactivate(){Pn=Pn.filter(e=>e!==this.element),this.currentFocus=null,document.removeEventListener(`focusin`,this.handleFocusIn),document.removeEventListener(`keydown`,this.handleKeyDown),document.removeEventListener(`keyup`,this.handleKeyUp)}isActive(){return Pn[Pn.length-1]===this.element}activateExternal(){this.isExternalActivated=!0}deactivateExternal(){this.isExternalActivated=!1}checkFocus(){if(this.isActive()&&!this.isExternalActivated){let e=Nn(this.element);if(!this.element.matches(`:focus-within`)){let t=e[0],n=e[e.length-1],r=this.tabDirection===`forward`?t:n;typeof r?.focus==`function`&&(this.currentFocus=r,r.focus({preventScroll:!1}))}}}possiblyHasTabbableChildren(e){return this.elementsWithTabbableControls.includes(e.tagName.toLowerCase())||e.hasAttribute(`controls`)}};function In(e,t){return{top:Math.round(e.getBoundingClientRect().top-t.getBoundingClientRect().top),left:Math.round(e.getBoundingClientRect().left-t.getBoundingClientRect().left)}}var Ln=new Set;function Rn(){let e=document.documentElement.clientWidth;return Math.abs(window.innerWidth-e)}function zn(){let e=Number(getComputedStyle(document.body).paddingRight.replace(/px/,``));return isNaN(e)||!e?0:e}function Bn(e){if(Ln.add(e),!document.documentElement.classList.contains(`sl-scroll-lock`)){let e=Rn()+zn(),t=getComputedStyle(document.documentElement).scrollbarGutter;(!t||t===`auto`)&&(t=`stable`),e<2&&(t=``),document.documentElement.style.setProperty(`--sl-scroll-lock-gutter`,t),document.documentElement.classList.add(`sl-scroll-lock`),document.documentElement.style.setProperty(`--sl-scroll-lock-size`,`${e}px`)}}function Vn(e){Ln.delete(e),Ln.size===0&&(document.documentElement.classList.remove(`sl-scroll-lock`),document.documentElement.style.removeProperty(`--sl-scroll-lock-size`))}function Hn(e,t,n=`vertical`,r=`smooth`){let i=In(e,t),a=i.top+t.scrollTop,o=i.left+t.scrollLeft,s=t.scrollLeft,c=t.scrollLeft+t.offsetWidth,l=t.scrollTop,u=t.scrollTop+t.offsetHeight;(n===`horizontal`||n===`both`)&&(o<s?t.scrollTo({left:o,behavior:r}):o+e.clientWidth>c&&t.scrollTo({left:o-t.offsetWidth+e.clientWidth,behavior:r})),(n===`vertical`||n===`both`)&&(a<l?t.scrollTo({top:a,behavior:r}):a+e.clientHeight>u&&t.scrollTo({top:a-t.offsetHeight+e.clientHeight,behavior:r}))}var Un=s`
  :host {
    --width: 31rem;
    --header-spacing: var(--sl-spacing-large);
    --body-spacing: var(--sl-spacing-large);
    --footer-spacing: var(--sl-spacing-large);

    display: contents;
  }

  .dialog {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: var(--sl-z-index-dialog);
  }

  .dialog__panel {
    display: flex;
    flex-direction: column;
    z-index: 2;
    width: var(--width);
    max-width: calc(100% - var(--sl-spacing-2x-large));
    max-height: calc(100% - var(--sl-spacing-2x-large));
    background-color: var(--sl-panel-background-color);
    border-radius: var(--sl-border-radius-medium);
    box-shadow: var(--sl-shadow-x-large);
  }

  .dialog__panel:focus {
    outline: none;
  }

  /* Ensure there's enough vertical padding for phones that don't update vh when chrome appears (e.g. iPhone) */
  @media screen and (max-width: 420px) {
    .dialog__panel {
      max-height: 80vh;
    }
  }

  .dialog--open .dialog__panel {
    display: flex;
    opacity: 1;
  }

  .dialog__header {
    flex: 0 0 auto;
    display: flex;
  }

  .dialog__title {
    flex: 1 1 auto;
    font: inherit;
    font-size: var(--sl-font-size-large);
    line-height: var(--sl-line-height-dense);
    padding: var(--header-spacing);
    margin: 0;
  }

  .dialog__header-actions {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--sl-spacing-2x-small);
    padding: 0 var(--header-spacing);
  }

  .dialog__header-actions sl-icon-button,
  .dialog__header-actions ::slotted(sl-icon-button) {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    font-size: var(--sl-font-size-medium);
  }

  .dialog__body {
    flex: 1 1 auto;
    display: block;
    padding: var(--body-spacing);
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .dialog__footer {
    flex: 0 0 auto;
    text-align: right;
    padding: var(--footer-spacing);
  }

  .dialog__footer ::slotted(sl-button:not(:first-of-type)) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  .dialog:not(.dialog--has-footer) .dialog__footer {
    display: none;
  }

  .dialog__overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: var(--sl-overlay-background-color);
  }

  @media (forced-colors: active) {
    .dialog__panel {
      border: solid 1px var(--sl-color-neutral-0);
    }
  }
`,Wn=class extends N{constructor(){super(...arguments),this.hasSlotController=new Yt(this,`footer`),this.localize=new cn(this),this.modal=new Fn(this),this.open=!1,this.label=``,this.noHeader=!1,this.handleDocumentKeyDown=e=>{e.key===`Escape`&&this.modal.isActive()&&this.open&&(e.stopPropagation(),this.requestClose(`keyboard`))}}firstUpdated(){this.dialog.hidden=!this.open,this.open&&(this.addOpenListeners(),this.modal.activate(),Bn(this))}disconnectedCallback(){super.disconnectedCallback(),this.modal.deactivate(),Vn(this),this.removeOpenListeners()}requestClose(e){if(this.emit(`sl-request-close`,{cancelable:!0,detail:{source:e}}).defaultPrevented){let e=Ut(this,`dialog.denyClose`,{dir:this.localize.dir()});Gt(this.panel,e.keyframes,e.options);return}this.hide()}addOpenListeners(){var e;`CloseWatcher`in window?((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>this.requestClose(`keyboard`)):document.addEventListener(`keydown`,this.handleDocumentKeyDown)}removeOpenListeners(){var e;(e=this.closeWatcher)==null||e.destroy(),document.removeEventListener(`keydown`,this.handleDocumentKeyDown)}async handleOpenChange(){if(this.open){this.emit(`sl-show`),this.addOpenListeners(),this.originalTrigger=document.activeElement,this.modal.activate(),Bn(this);let e=this.querySelector(`[autofocus]`);e&&e.removeAttribute(`autofocus`),await Promise.all([qt(this.dialog),qt(this.overlay)]),this.dialog.hidden=!1,requestAnimationFrame(()=>{this.emit(`sl-initial-focus`,{cancelable:!0}).defaultPrevented||(e?e.focus({preventScroll:!0}):this.panel.focus({preventScroll:!0})),e&&e.setAttribute(`autofocus`,``)});let t=Ut(this,`dialog.show`,{dir:this.localize.dir()}),n=Ut(this,`dialog.overlay.show`,{dir:this.localize.dir()});await Promise.all([Gt(this.panel,t.keyframes,t.options),Gt(this.overlay,n.keyframes,n.options)]),this.emit(`sl-after-show`)}else{e(this),this.emit(`sl-hide`),this.removeOpenListeners(),this.modal.deactivate(),await Promise.all([qt(this.dialog),qt(this.overlay)]);let t=Ut(this,`dialog.hide`,{dir:this.localize.dir()}),n=Ut(this,`dialog.overlay.hide`,{dir:this.localize.dir()});await Promise.all([Gt(this.overlay,n.keyframes,n.options).then(()=>{this.overlay.hidden=!0}),Gt(this.panel,t.keyframes,t.options).then(()=>{this.panel.hidden=!0})]),this.dialog.hidden=!0,this.overlay.hidden=!1,this.panel.hidden=!1,Vn(this);let r=this.originalTrigger;typeof r?.focus==`function`&&setTimeout(()=>r.focus()),this.emit(`sl-after-hide`)}}async show(){if(!this.open)return this.open=!0,Wt(this,`sl-after-show`)}async hide(){if(this.open)return this.open=!1,Wt(this,`sl-after-hide`)}render(){return w`
      <div
        part="base"
        class=${F({dialog:!0,"dialog--open":this.open,"dialog--has-footer":this.hasSlotController.test(`footer`)})}
      >
        <div part="overlay" class="dialog__overlay" @click=${()=>this.requestClose(`overlay`)} tabindex="-1"></div>

        <div
          part="panel"
          class="dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open?`false`:`true`}
          aria-label=${I(this.noHeader?this.label:void 0)}
          aria-labelledby=${I(this.noHeader?void 0:`title`)}
          tabindex="-1"
        >
          ${this.noHeader?``:w`
                <header part="header" class="dialog__header">
                  <h2 part="title" class="dialog__title" id="title">
                    <slot name="label"> ${this.label.length>0?this.label:`﻿`} </slot>
                  </h2>
                  <div part="header-actions" class="dialog__header-actions">
                    <slot name="header-actions"></slot>
                    <sl-icon-button
                      part="close-button"
                      exportparts="base:close-button__base"
                      class="dialog__close"
                      name="x-lg"
                      label=${this.localize.term(`close`)}
                      library="system"
                      @click="${()=>this.requestClose(`close-button`)}"
                    ></sl-icon-button>
                  </div>
                </header>
              `}
          ${``}
          <div part="body" class="dialog__body" tabindex="-1"><slot></slot></div>

          <footer part="footer" class="dialog__footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    `}};Wn.styles=[k,Un],Wn.dependencies={"sl-icon-button":L},D([M(`.dialog`)],Wn.prototype,`dialog`,2),D([M(`.dialog__panel`)],Wn.prototype,`panel`,2),D([M(`.dialog__overlay`)],Wn.prototype,`overlay`,2),D([A({type:Boolean,reflect:!0})],Wn.prototype,`open`,2),D([A({reflect:!0})],Wn.prototype,`label`,2),D([A({attribute:`no-header`,type:Boolean,reflect:!0})],Wn.prototype,`noHeader`,2),D([O(`open`,{waitUntilFirstUpdate:!0})],Wn.prototype,`handleOpenChange`,1),Ht(`dialog.show`,{keyframes:[{opacity:0,scale:.8},{opacity:1,scale:1}],options:{duration:250,easing:`ease`}}),Ht(`dialog.hide`,{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.8}],options:{duration:250,easing:`ease`}}),Ht(`dialog.denyClose`,{keyframes:[{scale:1},{scale:1.02},{scale:1}],options:{duration:250}}),Ht(`dialog.overlay.show`,{keyframes:[{opacity:0},{opacity:1}],options:{duration:250}}),Ht(`dialog.overlay.hide`,{keyframes:[{opacity:1},{opacity:0}],options:{duration:250}}),Wn.define(`sl-dialog`),P.define(`sl-icon`);var Gn=s`
  :host {
    display: block;
  }

  .input {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: stretch;
    justify-content: start;
    position: relative;
    width: 100%;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    overflow: hidden;
    cursor: text;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
  }

  /* Standard inputs */
  .input--standard {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .input--standard:hover:not(.input--disabled) {
    background-color: var(--sl-input-background-color-hover);
    border-color: var(--sl-input-border-color-hover);
  }

  .input--standard.input--focused:not(.input--disabled) {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  .input--standard.input--focused:not(.input--disabled) .input__control {
    color: var(--sl-input-color-focus);
  }

  .input--standard.input--disabled {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input--standard.input--disabled .input__control {
    color: var(--sl-input-color-disabled);
  }

  .input--standard.input--disabled .input__control::placeholder {
    color: var(--sl-input-placeholder-color-disabled);
  }

  /* Filled inputs */
  .input--filled {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .input--filled:hover:not(.input--disabled) {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .input--filled.input--focused:not(.input--disabled) {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .input--filled.input--disabled {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input__control {
    flex: 1 1 auto;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    min-width: 0;
    height: 100%;
    color: var(--sl-input-color);
    border: none;
    background: inherit;
    box-shadow: none;
    padding: 0;
    margin: 0;
    cursor: inherit;
    -webkit-appearance: none;
  }

  .input__control::-webkit-search-decoration,
  .input__control::-webkit-search-cancel-button,
  .input__control::-webkit-search-results-button,
  .input__control::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  .input__control:-webkit-autofill,
  .input__control:-webkit-autofill:hover,
  .input__control:-webkit-autofill:focus,
  .input__control:-webkit-autofill:active {
    box-shadow: 0 0 0 var(--sl-input-height-large) var(--sl-input-background-color-hover) inset !important;
    -webkit-text-fill-color: var(--sl-color-primary-500);
    caret-color: var(--sl-input-color);
  }

  .input--filled .input__control:-webkit-autofill,
  .input--filled .input__control:-webkit-autofill:hover,
  .input--filled .input__control:-webkit-autofill:focus,
  .input--filled .input__control:-webkit-autofill:active {
    box-shadow: 0 0 0 var(--sl-input-height-large) var(--sl-input-filled-background-color) inset !important;
  }

  .input__control::placeholder {
    color: var(--sl-input-placeholder-color);
    user-select: none;
    -webkit-user-select: none;
  }

  .input:hover:not(.input--disabled) .input__control {
    color: var(--sl-input-color-hover);
  }

  .input__control:focus {
    outline: none;
  }

  .input__prefix,
  .input__suffix {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    cursor: default;
  }

  .input__prefix ::slotted(sl-icon),
  .input__suffix ::slotted(sl-icon) {
    color: var(--sl-input-icon-color);
  }

  /*
   * Size modifiers
   */

  .input--small {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
    height: var(--sl-input-height-small);
  }

  .input--small .input__control {
    height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-small);
  }

  .input--small .input__clear,
  .input--small .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-small) * 2);
  }

  .input--small .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .input--small .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-small);
  }

  .input--medium {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
    height: var(--sl-input-height-medium);
  }

  .input--medium .input__control {
    height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-medium);
  }

  .input--medium .input__clear,
  .input--medium .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-medium) * 2);
  }

  .input--medium .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .input--medium .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-medium);
  }

  .input--large {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
    height: var(--sl-input-height-large);
  }

  .input--large .input__control {
    height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    padding: 0 var(--sl-input-spacing-large);
  }

  .input--large .input__clear,
  .input--large .input__password-toggle {
    width: calc(1em + var(--sl-input-spacing-large) * 2);
  }

  .input--large .input__prefix ::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .input--large .input__suffix ::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-large);
  }

  /*
   * Pill modifier
   */

  .input--pill.input--small {
    border-radius: var(--sl-input-height-small);
  }

  .input--pill.input--medium {
    border-radius: var(--sl-input-height-medium);
  }

  .input--pill.input--large {
    border-radius: var(--sl-input-height-large);
  }

  /*
   * Clearable + Password Toggle
   */

  .input__clear,
  .input__password-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: inherit;
    color: var(--sl-input-icon-color);
    border: none;
    background: none;
    padding: 0;
    transition: var(--sl-transition-fast) color;
    cursor: pointer;
  }

  .input__clear:hover,
  .input__password-toggle:hover {
    color: var(--sl-input-icon-color-hover);
  }

  .input__clear:focus,
  .input__password-toggle:focus {
    outline: none;
  }

  /* Don't show the browser's password toggle in Edge */
  ::-ms-reveal {
    display: none;
  }

  /* Hide the built-in number spinner */
  .input--no-spin-buttons input[type='number']::-webkit-outer-spin-button,
  .input--no-spin-buttons input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    display: none;
  }

  .input--no-spin-buttons input[type='number'] {
    -moz-appearance: textfield;
  }
`,Kn=(e=`value`)=>(t,n)=>{let r=t.constructor,i=r.prototype.attributeChangedCallback;r.prototype.attributeChangedCallback=function(t,a,o){let s=r.getPropertyOptions(e);if(t===(typeof s.attribute==`string`?s.attribute:e)){let t=s.converter||y,r=(typeof t==`function`?t:t?.fromAttribute??y.fromAttribute)(o,s.type);this[e]!==r&&(this[n]=r)}i.call(this,t,a,o)}},qn=s`
  .form-control .form-control__label {
    display: none;
  }

  .form-control .form-control__help-text {
    display: none;
  }

  /* Label */
  .form-control--has-label .form-control__label {
    display: inline-block;
    color: var(--sl-input-label-color);
    margin-bottom: var(--sl-spacing-3x-small);
  }

  .form-control--has-label.form-control--small .form-control__label {
    font-size: var(--sl-input-label-font-size-small);
  }

  .form-control--has-label.form-control--medium .form-control__label {
    font-size: var(--sl-input-label-font-size-medium);
  }

  .form-control--has-label.form-control--large .form-control__label {
    font-size: var(--sl-input-label-font-size-large);
  }

  :host([required]) .form-control--has-label .form-control__label::after {
    content: var(--sl-input-required-content);
    margin-inline-start: var(--sl-input-required-content-offset);
    color: var(--sl-input-required-content-color);
  }

  /* Help text */
  .form-control--has-help-text .form-control__help-text {
    display: block;
    color: var(--sl-input-help-text-color);
    margin-top: var(--sl-spacing-3x-small);
  }

  .form-control--has-help-text.form-control--small .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-small);
  }

  .form-control--has-help-text.form-control--medium .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-medium);
  }

  .form-control--has-help-text.form-control--large .form-control__help-text {
    font-size: var(--sl-input-help-text-font-size-large);
  }

  .form-control--has-help-text.form-control--radio-group .form-control__help-text {
    margin-top: var(--sl-spacing-2x-small);
  }
`,Jn=jt(class extends Mt{constructor(e){if(super(e),e.type!==At.PROPERTY&&e.type!==At.ATTRIBUTE&&e.type!==At.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Ct(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===T||t===E)return t;let n=e.element,r=e.name;if(e.type===At.PROPERTY){if(t===n[r])return T}else if(e.type===At.BOOLEAN_ATTRIBUTE){if(!!t===n.hasAttribute(r))return T}else if(e.type===At.ATTRIBUTE&&n.getAttribute(r)===t+``)return T;return Tt(e),t}}),B=class extends N{constructor(){super(...arguments),this.formControlController=new bn(this,{assumeInteractionOn:[`sl-blur`,`sl-input`]}),this.hasSlotController=new Yt(this,`help-text`,`label`),this.localize=new cn(this),this.hasFocus=!1,this.title=``,this.__numberInput=Object.assign(document.createElement(`input`),{type:`number`}),this.__dateInput=Object.assign(document.createElement(`input`),{type:`date`}),this.type=`text`,this.name=``,this.value=``,this.defaultValue=``,this.size=`medium`,this.filled=!1,this.pill=!1,this.label=``,this.helpText=``,this.clearable=!1,this.disabled=!1,this.placeholder=``,this.readonly=!1,this.passwordToggle=!1,this.passwordVisible=!1,this.noSpinButtons=!1,this.form=``,this.required=!1,this.spellcheck=!0}get valueAsDate(){return this.__dateInput.type=this.type,this.__dateInput.value=this.value,this.input?.valueAsDate||this.__dateInput.valueAsDate}set valueAsDate(e){this.__dateInput.type=this.type,this.__dateInput.valueAsDate=e,this.value=this.__dateInput.value}get valueAsNumber(){return this.__numberInput.value=this.value,this.input?.valueAsNumber||this.__numberInput.valueAsNumber}set valueAsNumber(e){this.__numberInput.valueAsNumber=e,this.value=this.__numberInput.value}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit(`sl-blur`)}handleChange(){this.value=this.input.value,this.emit(`sl-change`)}handleClearClick(e){e.preventDefault(),this.value!==``&&(this.value=``,this.emit(`sl-clear`),this.emit(`sl-input`),this.emit(`sl-change`)),this.input.focus()}handleFocus(){this.hasFocus=!0,this.emit(`sl-focus`)}handleInput(){this.value=this.input.value,this.formControlController.updateValidity(),this.emit(`sl-input`)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleKeyDown(e){let t=e.metaKey||e.ctrlKey||e.shiftKey||e.altKey;e.key===`Enter`&&!t&&setTimeout(()=>{!e.defaultPrevented&&!e.isComposing&&this.formControlController.submit()})}handlePasswordToggle(){this.passwordVisible=!this.passwordVisible}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleStepChange(){this.input.step=String(this.step),this.formControlController.updateValidity()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}setSelectionRange(e,t,n=`none`){this.input.setSelectionRange(e,t,n)}setRangeText(e,t,n,r=`preserve`){let i=t??this.input.selectionStart,a=n??this.input.selectionEnd;this.input.setRangeText(e,i,a,r),this.value!==this.input.value&&(this.value=this.input.value)}showPicker(){`showPicker`in HTMLInputElement.prototype&&this.input.showPicker()}stepUp(){this.input.stepUp(),this.value!==this.input.value&&(this.value=this.input.value)}stepDown(){this.input.stepDown(),this.value!==this.input.value&&(this.value=this.input.value)}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){let e=this.hasSlotController.test(`label`),t=this.hasSlotController.test(`help-text`),n=this.label?!0:!!e,r=this.helpText?!0:!!t,i=this.clearable&&!this.disabled&&!this.readonly&&(typeof this.value==`number`||this.value.length>0);return w`
      <div
        part="form-control"
        class=${F({"form-control":!0,"form-control--small":this.size===`small`,"form-control--medium":this.size===`medium`,"form-control--large":this.size===`large`,"form-control--has-label":n,"form-control--has-help-text":r})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${n?`false`:`true`}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${F({input:!0,"input--small":this.size===`small`,"input--medium":this.size===`medium`,"input--large":this.size===`large`,"input--pill":this.pill,"input--standard":!this.filled,"input--filled":this.filled,"input--disabled":this.disabled,"input--focused":this.hasFocus,"input--empty":!this.value,"input--no-spin-buttons":this.noSpinButtons})}
          >
            <span part="prefix" class="input__prefix">
              <slot name="prefix"></slot>
            </span>

            <input
              part="input"
              id="input"
              class="input__control"
              type=${this.type===`password`&&this.passwordVisible?`text`:this.type}
              title=${this.title}
              name=${I(this.name)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${I(this.placeholder)}
              minlength=${I(this.minlength)}
              maxlength=${I(this.maxlength)}
              min=${I(this.min)}
              max=${I(this.max)}
              step=${I(this.step)}
              .value=${Jn(this.value)}
              autocapitalize=${I(this.autocapitalize)}
              autocomplete=${I(this.autocomplete)}
              autocorrect=${I(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${this.spellcheck}
              pattern=${I(this.pattern)}
              enterkeyhint=${I(this.enterkeyhint)}
              inputmode=${I(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @keydown=${this.handleKeyDown}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            />

            ${i?w`
                  <button
                    part="clear-button"
                    class="input__clear"
                    type="button"
                    aria-label=${this.localize.term(`clearEntry`)}
                    @click=${this.handleClearClick}
                    tabindex="-1"
                  >
                    <slot name="clear-icon">
                      <sl-icon name="x-circle-fill" library="system"></sl-icon>
                    </slot>
                  </button>
                `:``}
            ${this.passwordToggle&&!this.disabled?w`
                  <button
                    part="password-toggle-button"
                    class="input__password-toggle"
                    type="button"
                    aria-label=${this.localize.term(this.passwordVisible?`hidePassword`:`showPassword`)}
                    @click=${this.handlePasswordToggle}
                    tabindex="-1"
                  >
                    ${this.passwordVisible?w`
                          <slot name="show-password-icon">
                            <sl-icon name="eye-slash" library="system"></sl-icon>
                          </slot>
                        `:w`
                          <slot name="hide-password-icon">
                            <sl-icon name="eye" library="system"></sl-icon>
                          </slot>
                        `}
                  </button>
                `:``}

            <span part="suffix" class="input__suffix">
              <slot name="suffix"></slot>
            </span>
          </div>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${r?`false`:`true`}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};B.styles=[k,qn,Gn],B.dependencies={"sl-icon":P},D([M(`.input__control`)],B.prototype,`input`,2),D([j()],B.prototype,`hasFocus`,2),D([A()],B.prototype,`title`,2),D([A({reflect:!0})],B.prototype,`type`,2),D([A()],B.prototype,`name`,2),D([A()],B.prototype,`value`,2),D([Kn()],B.prototype,`defaultValue`,2),D([A({reflect:!0})],B.prototype,`size`,2),D([A({type:Boolean,reflect:!0})],B.prototype,`filled`,2),D([A({type:Boolean,reflect:!0})],B.prototype,`pill`,2),D([A()],B.prototype,`label`,2),D([A({attribute:`help-text`})],B.prototype,`helpText`,2),D([A({type:Boolean})],B.prototype,`clearable`,2),D([A({type:Boolean,reflect:!0})],B.prototype,`disabled`,2),D([A()],B.prototype,`placeholder`,2),D([A({type:Boolean,reflect:!0})],B.prototype,`readonly`,2),D([A({attribute:`password-toggle`,type:Boolean})],B.prototype,`passwordToggle`,2),D([A({attribute:`password-visible`,type:Boolean})],B.prototype,`passwordVisible`,2),D([A({attribute:`no-spin-buttons`,type:Boolean})],B.prototype,`noSpinButtons`,2),D([A({reflect:!0})],B.prototype,`form`,2),D([A({type:Boolean,reflect:!0})],B.prototype,`required`,2),D([A()],B.prototype,`pattern`,2),D([A({type:Number})],B.prototype,`minlength`,2),D([A({type:Number})],B.prototype,`maxlength`,2),D([A()],B.prototype,`min`,2),D([A()],B.prototype,`max`,2),D([A()],B.prototype,`step`,2),D([A()],B.prototype,`autocapitalize`,2),D([A()],B.prototype,`autocorrect`,2),D([A()],B.prototype,`autocomplete`,2),D([A({type:Boolean})],B.prototype,`autofocus`,2),D([A()],B.prototype,`enterkeyhint`,2),D([A({type:Boolean,converter:{fromAttribute:e=>!(!e||e===`false`),toAttribute:e=>e?`true`:`false`}})],B.prototype,`spellcheck`,2),D([A()],B.prototype,`inputmode`,2),D([O(`disabled`,{waitUntilFirstUpdate:!0})],B.prototype,`handleDisabledChange`,1),D([O(`step`,{waitUntilFirstUpdate:!0})],B.prototype,`handleStepChange`,1),D([O(`value`,{waitUntilFirstUpdate:!0})],B.prototype,`handleValueChange`,1),B.define(`sl-input`);var Yn=s`
  :host {
    display: block;
    user-select: none;
    -webkit-user-select: none;
  }

  :host(:focus) {
    outline: none;
  }

  .option {
    position: relative;
    display: flex;
    align-items: center;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-letter-spacing-normal);
    color: var(--sl-color-neutral-700);
    padding: var(--sl-spacing-x-small) var(--sl-spacing-medium) var(--sl-spacing-x-small) var(--sl-spacing-x-small);
    transition: var(--sl-transition-fast) fill;
    cursor: pointer;
  }

  .option--hover:not(.option--current):not(.option--disabled) {
    background-color: var(--sl-color-neutral-100);
    color: var(--sl-color-neutral-1000);
  }

  .option--current,
  .option--current.option--disabled {
    background-color: var(--sl-color-primary-600);
    color: var(--sl-color-neutral-0);
    opacity: 1;
  }

  .option--disabled {
    outline: none;
    opacity: 0.5;
    cursor: not-allowed;
  }

  .option__label {
    flex: 1 1 auto;
    display: inline-block;
    line-height: var(--sl-line-height-dense);
  }

  .option .option__check {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    visibility: hidden;
    padding-inline-end: var(--sl-spacing-2x-small);
  }

  .option--selected .option__check {
    visibility: visible;
  }

  .option__prefix,
  .option__suffix {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }

  .option__prefix::slotted(*) {
    margin-inline-end: var(--sl-spacing-x-small);
  }

  .option__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  @media (forced-colors: active) {
    :host(:hover:not([aria-disabled='true'])) .option {
      outline: dashed 1px SelectedItem;
      outline-offset: -1px;
    }
  }
`,Xn=class extends N{constructor(){super(...arguments),this.localize=new cn(this),this.isInitialized=!1,this.current=!1,this.selected=!1,this.hasHover=!1,this.value=``,this.disabled=!1}connectedCallback(){super.connectedCallback(),this.setAttribute(`role`,`option`),this.setAttribute(`aria-selected`,`false`)}handleDefaultSlotChange(){this.isInitialized?customElements.whenDefined(`sl-select`).then(()=>{let e=this.closest(`sl-select`);e&&e.handleDefaultSlotChange()}):this.isInitialized=!0}handleMouseEnter(){this.hasHover=!0}handleMouseLeave(){this.hasHover=!1}handleDisabledChange(){this.setAttribute(`aria-disabled`,this.disabled?`true`:`false`)}handleSelectedChange(){this.setAttribute(`aria-selected`,this.selected?`true`:`false`)}handleValueChange(){typeof this.value!=`string`&&(this.value=String(this.value)),this.value.includes(` `)&&(console.error(`Option values cannot include a space. All spaces have been replaced with underscores.`,this),this.value=this.value.replace(/ /g,`_`))}getTextLabel(){let e=this.childNodes,t=``;return[...e].forEach(e=>{e.nodeType===Node.ELEMENT_NODE&&(e.hasAttribute(`slot`)||(t+=e.textContent)),e.nodeType===Node.TEXT_NODE&&(t+=e.textContent)}),t.trim()}render(){return w`
      <div
        part="base"
        class=${F({option:!0,"option--current":this.current,"option--disabled":this.disabled,"option--selected":this.selected,"option--hover":this.hasHover})}
        @mouseenter=${this.handleMouseEnter}
        @mouseleave=${this.handleMouseLeave}
      >
        <sl-icon part="checked-icon" class="option__check" name="check" library="system" aria-hidden="true"></sl-icon>
        <slot part="prefix" name="prefix" class="option__prefix"></slot>
        <slot part="label" class="option__label" @slotchange=${this.handleDefaultSlotChange}></slot>
        <slot part="suffix" name="suffix" class="option__suffix"></slot>
      </div>
    `}};Xn.styles=[k,Yn],Xn.dependencies={"sl-icon":P},D([M(`.option__label`)],Xn.prototype,`defaultSlot`,2),D([j()],Xn.prototype,`current`,2),D([j()],Xn.prototype,`selected`,2),D([j()],Xn.prototype,`hasHover`,2),D([A({reflect:!0})],Xn.prototype,`value`,2),D([A({type:Boolean,reflect:!0})],Xn.prototype,`disabled`,2),D([O(`disabled`)],Xn.prototype,`handleDisabledChange`,1),D([O(`selected`)],Xn.prototype,`handleSelectedChange`,1),D([O(`value`)],Xn.prototype,`handleValueChange`,1),Xn.define(`sl-option`);var Zn=s`
  :host {
    display: inline-block;
  }

  .tag {
    display: flex;
    align-items: center;
    border: solid 1px;
    line-height: 1;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
  }

  .tag__remove::part(base) {
    color: inherit;
    padding: 0;
  }

  /*
   * Variant modifiers
   */

  .tag--primary {
    background-color: var(--sl-color-primary-50);
    border-color: var(--sl-color-primary-200);
    color: var(--sl-color-primary-800);
  }

  .tag--primary:active > sl-icon-button {
    color: var(--sl-color-primary-600);
  }

  .tag--success {
    background-color: var(--sl-color-success-50);
    border-color: var(--sl-color-success-200);
    color: var(--sl-color-success-800);
  }

  .tag--success:active > sl-icon-button {
    color: var(--sl-color-success-600);
  }

  .tag--neutral {
    background-color: var(--sl-color-neutral-50);
    border-color: var(--sl-color-neutral-200);
    color: var(--sl-color-neutral-800);
  }

  .tag--neutral:active > sl-icon-button {
    color: var(--sl-color-neutral-600);
  }

  .tag--warning {
    background-color: var(--sl-color-warning-50);
    border-color: var(--sl-color-warning-200);
    color: var(--sl-color-warning-800);
  }

  .tag--warning:active > sl-icon-button {
    color: var(--sl-color-warning-600);
  }

  .tag--danger {
    background-color: var(--sl-color-danger-50);
    border-color: var(--sl-color-danger-200);
    color: var(--sl-color-danger-800);
  }

  .tag--danger:active > sl-icon-button {
    color: var(--sl-color-danger-600);
  }

  /*
   * Size modifiers
   */

  .tag--small {
    font-size: var(--sl-button-font-size-small);
    height: calc(var(--sl-input-height-small) * 0.8);
    line-height: calc(var(--sl-input-height-small) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-small);
    padding: 0 var(--sl-spacing-x-small);
  }

  .tag--medium {
    font-size: var(--sl-button-font-size-medium);
    height: calc(var(--sl-input-height-medium) * 0.8);
    line-height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-medium);
    padding: 0 var(--sl-spacing-small);
  }

  .tag--large {
    font-size: var(--sl-button-font-size-large);
    height: calc(var(--sl-input-height-large) * 0.8);
    line-height: calc(var(--sl-input-height-large) - var(--sl-input-border-width) * 2);
    border-radius: var(--sl-input-border-radius-large);
    padding: 0 var(--sl-spacing-medium);
  }

  .tag__remove {
    margin-inline-start: var(--sl-spacing-x-small);
  }

  /*
   * Pill modifier
   */

  .tag--pill {
    border-radius: var(--sl-border-radius-pill);
  }
`,Qn=class extends N{constructor(){super(...arguments),this.localize=new cn(this),this.variant=`neutral`,this.size=`medium`,this.pill=!1,this.removable=!1}handleRemoveClick(){this.emit(`sl-remove`)}render(){return w`
      <span
        part="base"
        class=${F({tag:!0,"tag--primary":this.variant===`primary`,"tag--success":this.variant===`success`,"tag--neutral":this.variant===`neutral`,"tag--warning":this.variant===`warning`,"tag--danger":this.variant===`danger`,"tag--text":this.variant===`text`,"tag--small":this.size===`small`,"tag--medium":this.size===`medium`,"tag--large":this.size===`large`,"tag--pill":this.pill,"tag--removable":this.removable})}
      >
        <slot part="content" class="tag__content"></slot>

        ${this.removable?w`
              <sl-icon-button
                part="remove-button"
                exportparts="base:remove-button__base"
                name="x-lg"
                library="system"
                label=${this.localize.term(`remove`)}
                class="tag__remove"
                @click=${this.handleRemoveClick}
                tabindex="-1"
              ></sl-icon-button>
            `:``}
      </span>
    `}};Qn.styles=[k,Zn],Qn.dependencies={"sl-icon-button":L},D([A({reflect:!0})],Qn.prototype,`variant`,2),D([A({reflect:!0})],Qn.prototype,`size`,2),D([A({type:Boolean,reflect:!0})],Qn.prototype,`pill`,2),D([A({type:Boolean})],Qn.prototype,`removable`,2);var $n=s`
  :host {
    display: block;
  }

  /** The popup */
  .select {
    flex: 1 1 auto;
    display: inline-flex;
    width: 100%;
    position: relative;
    vertical-align: middle;
  }

  .select::part(popup) {
    z-index: var(--sl-z-index-dropdown);
  }

  .select[data-current-placement^='top']::part(popup) {
    transform-origin: bottom;
  }

  .select[data-current-placement^='bottom']::part(popup) {
    transform-origin: top;
  }

  /* Combobox */
  .select__combobox {
    flex: 1;
    display: flex;
    width: 100%;
    min-width: 0;
    position: relative;
    align-items: center;
    justify-content: start;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    overflow: hidden;
    cursor: pointer;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
  }

  .select__display-input {
    position: relative;
    width: 100%;
    font: inherit;
    border: none;
    background: none;
    color: var(--sl-input-color);
    cursor: inherit;
    overflow: hidden;
    padding: 0;
    margin: 0;
    -webkit-appearance: none;
  }

  .select__display-input::placeholder {
    color: var(--sl-input-placeholder-color);
  }

  .select:not(.select--disabled):hover .select__display-input {
    color: var(--sl-input-color-hover);
  }

  .select__display-input:focus {
    outline: none;
  }

  /* Visually hide the display input when multiple is enabled */
  .select--multiple:not(.select--placeholder-visible) .select__display-input {
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  .select__value-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    opacity: 0;
    z-index: -1;
  }

  .select__tags {
    display: flex;
    flex: 1;
    align-items: center;
    flex-wrap: wrap;
    margin-inline-start: var(--sl-spacing-2x-small);
  }

  .select__tags::slotted(sl-tag) {
    cursor: pointer !important;
  }

  .select--disabled .select__tags,
  .select--disabled .select__tags::slotted(sl-tag) {
    cursor: not-allowed !important;
  }

  /* Standard selects */
  .select--standard .select__combobox {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .select--standard.select--disabled .select__combobox {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    color: var(--sl-input-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
    outline: none;
  }

  .select--standard:not(.select--disabled).select--open .select__combobox,
  .select--standard:not(.select--disabled).select--focused .select__combobox {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  /* Filled selects */
  .select--filled .select__combobox {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .select--filled:hover:not(.select--disabled) .select__combobox {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .select--filled.select--disabled .select__combobox {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .select--filled:not(.select--disabled).select--open .select__combobox,
  .select--filled:not(.select--disabled).select--focused .select__combobox {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
  }

  /* Sizes */
  .select--small .select__combobox {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
    min-height: var(--sl-input-height-small);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-small);
  }

  .select--small .select__clear {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .select--small .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-small);
  }

  .select--small.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-small);
  }

  .select--small.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-block: 2px;
    padding-inline-start: 0;
  }

  .select--small .select__tags {
    gap: 2px;
  }

  .select--medium .select__combobox {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
    min-height: var(--sl-input-height-medium);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-medium);
  }

  .select--medium .select__clear {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .select--medium .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-medium);
  }

  .select--medium.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-medium);
  }

  .select--medium.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-inline-start: 0;
    padding-block: 3px;
  }

  .select--medium .select__tags {
    gap: 3px;
  }

  .select--large .select__combobox {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
    min-height: var(--sl-input-height-large);
    padding-block: 0;
    padding-inline: var(--sl-input-spacing-large);
  }

  .select--large .select__clear {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .select--large .select__prefix::slotted(*) {
    margin-inline-end: var(--sl-input-spacing-large);
  }

  .select--large.select--multiple:not(.select--placeholder-visible) .select__prefix::slotted(*) {
    margin-inline-start: var(--sl-input-spacing-large);
  }

  .select--large.select--multiple:not(.select--placeholder-visible) .select__combobox {
    padding-inline-start: 0;
    padding-block: 4px;
  }

  .select--large .select__tags {
    gap: 4px;
  }

  /* Pills */
  .select--pill.select--small .select__combobox {
    border-radius: var(--sl-input-height-small);
  }

  .select--pill.select--medium .select__combobox {
    border-radius: var(--sl-input-height-medium);
  }

  .select--pill.select--large .select__combobox {
    border-radius: var(--sl-input-height-large);
  }

  /* Prefix and Suffix */
  .select__prefix,
  .select__suffix {
    flex: 0;
    display: inline-flex;
    align-items: center;
    color: var(--sl-input-placeholder-color);
  }

  .select__suffix::slotted(*) {
    margin-inline-start: var(--sl-spacing-small);
  }

  /* Clear button */
  .select__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: inherit;
    color: var(--sl-input-icon-color);
    border: none;
    background: none;
    padding: 0;
    transition: var(--sl-transition-fast) color;
    cursor: pointer;
  }

  .select__clear:hover {
    color: var(--sl-input-icon-color-hover);
  }

  .select__clear:focus {
    outline: none;
  }

  /* Expand icon */
  .select__expand-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    transition: var(--sl-transition-medium) rotate ease;
    rotate: 0;
    margin-inline-start: var(--sl-spacing-small);
  }

  .select--open .select__expand-icon {
    rotate: -180deg;
  }

  /* Listbox */
  .select__listbox {
    display: block;
    position: relative;
    font-family: var(--sl-font-sans);
    font-size: var(--sl-font-size-medium);
    font-weight: var(--sl-font-weight-normal);
    box-shadow: var(--sl-shadow-large);
    background: var(--sl-panel-background-color);
    border: solid var(--sl-panel-border-width) var(--sl-panel-border-color);
    border-radius: var(--sl-border-radius-medium);
    padding-block: var(--sl-spacing-x-small);
    padding-inline: 0;
    overflow: auto;
    overscroll-behavior: none;

    /* Make sure it adheres to the popup's auto size */
    max-width: var(--auto-size-available-width);
    max-height: var(--auto-size-available-height);
  }

  .select__listbox ::slotted(sl-divider) {
    --spacing: var(--sl-spacing-x-small);
  }

  .select__listbox ::slotted(small) {
    display: block;
    font-size: var(--sl-font-size-small);
    font-weight: var(--sl-font-weight-semibold);
    color: var(--sl-color-neutral-500);
    padding-block: var(--sl-spacing-2x-small);
    padding-inline: var(--sl-spacing-x-large);
  }
`,er=s`
  :host {
    --arrow-color: var(--sl-color-neutral-1000);
    --arrow-size: 6px;

    /*
     * These properties are computed to account for the arrow's dimensions after being rotated 45º. The constant
     * 0.7071 is derived from sin(45), which is the diagonal size of the arrow's container after rotating.
     */
    --arrow-size-diagonal: calc(var(--arrow-size) * 0.7071);
    --arrow-padding-offset: calc(var(--arrow-size-diagonal) - var(--arrow-size));

    display: contents;
  }

  .popup {
    position: absolute;
    isolation: isolate;
    max-width: var(--auto-size-available-width, none);
    max-height: var(--auto-size-available-height, none);
  }

  .popup--fixed {
    position: fixed;
  }

  .popup:not(.popup--active) {
    display: none;
  }

  .popup__arrow {
    position: absolute;
    width: calc(var(--arrow-size-diagonal) * 2);
    height: calc(var(--arrow-size-diagonal) * 2);
    rotate: 45deg;
    background: var(--arrow-color);
    z-index: -1;
  }

  /* Hover bridge */
  .popup-hover-bridge:not(.popup-hover-bridge--visible) {
    display: none;
  }

  .popup-hover-bridge {
    position: fixed;
    z-index: calc(var(--sl-z-index-dropdown) - 1);
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    clip-path: polygon(
      var(--hover-bridge-top-left-x, 0) var(--hover-bridge-top-left-y, 0),
      var(--hover-bridge-top-right-x, 0) var(--hover-bridge-top-right-y, 0),
      var(--hover-bridge-bottom-right-x, 0) var(--hover-bridge-bottom-right-y, 0),
      var(--hover-bridge-bottom-left-x, 0) var(--hover-bridge-bottom-left-y, 0)
    );
  }
`,tr=Math.min,V=Math.max,nr=Math.round,rr=Math.floor,ir=e=>({x:e,y:e}),ar={left:`right`,right:`left`,bottom:`top`,top:`bottom`};function or(e,t,n){return V(e,tr(t,n))}function sr(e,t){return typeof e==`function`?e(t):e}function cr(e){return e.split(`-`)[0]}function lr(e){return e.split(`-`)[1]}function ur(e){return e===`x`?`y`:`x`}function dr(e){return e===`y`?`height`:`width`}function fr(e){let t=e[0];return t===`t`||t===`b`?`y`:`x`}function pr(e){return ur(fr(e))}function mr(e,t,n){n===void 0&&(n=!1);let r=lr(e),i=pr(e),a=dr(i),o=i===`x`?r===(n?`end`:`start`)?`right`:`left`:r===`start`?`bottom`:`top`;return t.reference[a]>t.floating[a]&&(o=Cr(o)),[o,Cr(o)]}function hr(e){let t=Cr(e);return[gr(e),t,gr(t)]}function gr(e){return e.includes(`start`)?e.replace(`start`,`end`):e.replace(`end`,`start`)}var _r=[`left`,`right`],vr=[`right`,`left`],yr=[`top`,`bottom`],br=[`bottom`,`top`];function xr(e,t,n){switch(e){case`top`:case`bottom`:return n?t?vr:_r:t?_r:vr;case`left`:case`right`:return t?yr:br;default:return[]}}function Sr(e,t,n,r){let i=lr(e),a=xr(cr(e),n===`start`,r);return i&&(a=a.map(e=>e+`-`+i),t&&(a=a.concat(a.map(gr)))),a}function Cr(e){let t=cr(e);return ar[t]+e.slice(t.length)}function wr(e){return{top:0,right:0,bottom:0,left:0,...e}}function Tr(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:wr(e)}function Er(e){let{x:t,y:n,width:r,height:i}=e;return{width:r,height:i,top:n,left:t,right:t+r,bottom:n+i,x:t,y:n}}function Dr(e,t,n){let{reference:r,floating:i}=e,a=fr(t),o=pr(t),s=dr(o),c=cr(t),l=a===`y`,u=r.x+r.width/2-i.width/2,d=r.y+r.height/2-i.height/2,f=r[s]/2-i[s]/2,p;switch(c){case`top`:p={x:u,y:r.y-i.height};break;case`bottom`:p={x:u,y:r.y+r.height};break;case`right`:p={x:r.x+r.width,y:d};break;case`left`:p={x:r.x-i.width,y:d};break;default:p={x:r.x,y:r.y}}switch(lr(t)){case`start`:p[o]-=f*(n&&l?-1:1);break;case`end`:p[o]+=f*(n&&l?-1:1);break}return p}async function Or(e,t){t===void 0&&(t={});let{x:n,y:r,platform:i,rects:a,elements:o,strategy:s}=e,{boundary:c=`clippingAncestors`,rootBoundary:l=`viewport`,elementContext:u=`floating`,altBoundary:d=!1,padding:f=0}=sr(t,e),p=Tr(f),m=o[d?u===`floating`?`reference`:`floating`:u],h=Er(await i.getClippingRect({element:await(i.isElement==null?void 0:i.isElement(m))??!0?m:m.contextElement||await(i.getDocumentElement==null?void 0:i.getDocumentElement(o.floating)),boundary:c,rootBoundary:l,strategy:s})),g=u===`floating`?{x:n,y:r,width:a.floating.width,height:a.floating.height}:a.reference,_=await(i.getOffsetParent==null?void 0:i.getOffsetParent(o.floating)),ee=await(i.isElement==null?void 0:i.isElement(_))&&await(i.getScale==null?void 0:i.getScale(_))||{x:1,y:1},v=Er(i.convertOffsetParentRelativeRectToViewportRelativeRect?await i.convertOffsetParentRelativeRectToViewportRelativeRect({elements:o,rect:g,offsetParent:_,strategy:s}):g);return{top:(h.top-v.top+p.top)/ee.y,bottom:(v.bottom-h.bottom+p.bottom)/ee.y,left:(h.left-v.left+p.left)/ee.x,right:(v.right-h.right+p.right)/ee.x}}var kr=50,Ar=async(e,t,n)=>{let{placement:r=`bottom`,strategy:i=`absolute`,middleware:a=[],platform:o}=n,s=o.detectOverflow?o:{...o,detectOverflow:Or},c=await(o.isRTL==null?void 0:o.isRTL(t)),l=await o.getElementRects({reference:e,floating:t,strategy:i}),{x:u,y:d}=Dr(l,r,c),f=r,p=0,m={};for(let n=0;n<a.length;n++){let h=a[n];if(!h)continue;let{name:g,fn:_}=h,{x:ee,y:v,data:te,reset:y}=await _({x:u,y:d,initialPlacement:r,placement:f,strategy:i,middlewareData:m,rects:l,platform:s,elements:{reference:e,floating:t}});u=ee??u,d=v??d,m[g]={...m[g],...te},y&&p<kr&&(p++,typeof y==`object`&&(y.placement&&(f=y.placement),y.rects&&(l=y.rects===!0?await o.getElementRects({reference:e,floating:t,strategy:i}):y.rects),{x:u,y:d}=Dr(l,f,c)),n=-1)}return{x:u,y:d,placement:f,strategy:i,middlewareData:m}},jr=e=>({name:`arrow`,options:e,async fn(t){let{x:n,y:r,placement:i,rects:a,platform:o,elements:s,middlewareData:c}=t,{element:l,padding:u=0}=sr(e,t)||{};if(l==null)return{};let d=Tr(u),f={x:n,y:r},p=pr(i),m=dr(p),h=await o.getDimensions(l),g=p===`y`,_=g?`top`:`left`,ee=g?`bottom`:`right`,v=g?`clientHeight`:`clientWidth`,te=a.reference[m]+a.reference[p]-f[p]-a.floating[m],y=f[p]-a.reference[p],ne=await(o.getOffsetParent==null?void 0:o.getOffsetParent(l)),b=ne?ne[v]:0;(!b||!await(o.isElement==null?void 0:o.isElement(ne)))&&(b=s.floating[v]||a.floating[m]);let x=te/2-y/2,S=b/2-h[m]/2-1,re=tr(d[_],S),ie=tr(d[ee],S),ae=re,oe=b-h[m]-ie,C=b/2-h[m]/2+x,se=or(ae,C,oe),ce=!c.arrow&&lr(i)!=null&&C!==se&&a.reference[m]/2-(C<ae?re:ie)-h[m]/2<0,le=ce?C<ae?C-ae:C-oe:0;return{[p]:f[p]+le,data:{[p]:se,centerOffset:C-se-le,...ce&&{alignmentOffset:le}},reset:ce}}}),Mr=function(e){return e===void 0&&(e={}),{name:`flip`,options:e,async fn(t){var n;let{placement:r,middlewareData:i,rects:a,initialPlacement:o,platform:s,elements:c}=t,{mainAxis:l=!0,crossAxis:u=!0,fallbackPlacements:d,fallbackStrategy:f=`bestFit`,fallbackAxisSideDirection:p=`none`,flipAlignment:m=!0,...h}=sr(e,t);if((n=i.arrow)!=null&&n.alignmentOffset)return{};let g=cr(r),_=fr(o),ee=cr(o)===o,v=await(s.isRTL==null?void 0:s.isRTL(c.floating)),te=d||(ee||!m?[Cr(o)]:hr(o)),y=p!==`none`;!d&&y&&te.push(...Sr(o,m,p,v));let ne=[o,...te],b=await s.detectOverflow(t,h),x=[],S=i.flip?.overflows||[];if(l&&x.push(b[g]),u){let e=mr(r,a,v);x.push(b[e[0]],b[e[1]])}if(S=[...S,{placement:r,overflows:x}],!x.every(e=>e<=0)){let e=(i.flip?.index||0)+1,t=ne[e];if(t&&(!(u===`alignment`&&_!==fr(t))||S.every(e=>fr(e.placement)===_?e.overflows[0]>0:!0)))return{data:{index:e,overflows:S},reset:{placement:t}};let n=S.filter(e=>e.overflows[0]<=0).sort((e,t)=>e.overflows[1]-t.overflows[1])[0]?.placement;if(!n)switch(f){case`bestFit`:{let e=S.filter(e=>{if(y){let t=fr(e.placement);return t===_||t===`y`}return!0}).map(e=>[e.placement,e.overflows.filter(e=>e>0).reduce((e,t)=>e+t,0)]).sort((e,t)=>e[1]-t[1])[0]?.[0];e&&(n=e);break}case`initialPlacement`:n=o;break}if(r!==n)return{reset:{placement:n}}}return{}}}},Nr=new Set([`left`,`top`]);async function Pr(e,t){let{placement:n,platform:r,elements:i}=e,a=await(r.isRTL==null?void 0:r.isRTL(i.floating)),o=cr(n),s=lr(n),c=fr(n)===`y`,l=Nr.has(o)?-1:1,u=a&&c?-1:1,d=sr(t,e),{mainAxis:f,crossAxis:p,alignmentAxis:m}=typeof d==`number`?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:d.mainAxis||0,crossAxis:d.crossAxis||0,alignmentAxis:d.alignmentAxis};return s&&typeof m==`number`&&(p=s===`end`?m*-1:m),c?{x:p*u,y:f*l}:{x:f*l,y:p*u}}var Fr=function(e){return e===void 0&&(e=0),{name:`offset`,options:e,async fn(t){var n;let{x:r,y:i,placement:a,middlewareData:o}=t,s=await Pr(t,e);return a===o.offset?.placement&&(n=o.arrow)!=null&&n.alignmentOffset?{}:{x:r+s.x,y:i+s.y,data:{...s,placement:a}}}}},Ir=function(e){return e===void 0&&(e={}),{name:`shift`,options:e,async fn(t){let{x:n,y:r,placement:i,platform:a}=t,{mainAxis:o=!0,crossAxis:s=!1,limiter:c={fn:e=>{let{x:t,y:n}=e;return{x:t,y:n}}},...l}=sr(e,t),u={x:n,y:r},d=await a.detectOverflow(t,l),f=fr(cr(i)),p=ur(f),m=u[p],h=u[f];if(o){let e=p===`y`?`top`:`left`,t=p===`y`?`bottom`:`right`,n=m+d[e],r=m-d[t];m=or(n,m,r)}if(s){let e=f===`y`?`top`:`left`,t=f===`y`?`bottom`:`right`,n=h+d[e],r=h-d[t];h=or(n,h,r)}let g=c.fn({...t,[p]:m,[f]:h});return{...g,data:{x:g.x-n,y:g.y-r,enabled:{[p]:o,[f]:s}}}}}},Lr=function(e){return e===void 0&&(e={}),{name:`size`,options:e,async fn(t){var n,r;let{placement:i,rects:a,platform:o,elements:s}=t,{apply:c=()=>{},...l}=sr(e,t),u=await o.detectOverflow(t,l),d=cr(i),f=lr(i),p=fr(i)===`y`,{width:m,height:h}=a.floating,g,_;d===`top`||d===`bottom`?(g=d,_=f===(await(o.isRTL==null?void 0:o.isRTL(s.floating))?`start`:`end`)?`left`:`right`):(_=d,g=f===`end`?`top`:`bottom`);let ee=h-u.top-u.bottom,v=m-u.left-u.right,te=tr(h-u[g],ee),y=tr(m-u[_],v),ne=!t.middlewareData.shift,b=te,x=y;if((n=t.middlewareData.shift)!=null&&n.enabled.x&&(x=v),(r=t.middlewareData.shift)!=null&&r.enabled.y&&(b=ee),ne&&!f){let e=V(u.left,0),t=V(u.right,0),n=V(u.top,0),r=V(u.bottom,0);p?x=m-2*(e!==0||t!==0?e+t:V(u.left,u.right)):b=h-2*(n!==0||r!==0?n+r:V(u.top,u.bottom))}await c({...t,availableWidth:x,availableHeight:b});let S=await o.getDimensions(s.floating);return m!==S.width||h!==S.height?{reset:{rects:!0}}:{}}}};function Rr(){return typeof window<`u`}function zr(e){return Vr(e)?(e.nodeName||``).toLowerCase():`#document`}function H(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function Br(e){return((Vr(e)?e.ownerDocument:e.document)||window.document)?.documentElement}function Vr(e){return Rr()?e instanceof Node||e instanceof H(e).Node:!1}function Hr(e){return Rr()?e instanceof Element||e instanceof H(e).Element:!1}function Ur(e){return Rr()?e instanceof HTMLElement||e instanceof H(e).HTMLElement:!1}function Wr(e){return!Rr()||typeof ShadowRoot>`u`?!1:e instanceof ShadowRoot||e instanceof H(e).ShadowRoot}function Gr(e){let{overflow:t,overflowX:n,overflowY:r,display:i}=ni(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&i!==`inline`&&i!==`contents`}function Kr(e){return/^(table|td|th)$/.test(zr(e))}function qr(e){try{if(e.matches(`:popover-open`))return!0}catch{}try{return e.matches(`:modal`)}catch{return!1}}var Jr=/transform|translate|scale|rotate|perspective|filter/,Yr=/paint|layout|strict|content/,Xr=e=>!!e&&e!==`none`,Zr;function Qr(e){let t=Hr(e)?ni(e):e;return Xr(t.transform)||Xr(t.translate)||Xr(t.scale)||Xr(t.rotate)||Xr(t.perspective)||!ei()&&(Xr(t.backdropFilter)||Xr(t.filter))||Jr.test(t.willChange||``)||Yr.test(t.contain||``)}function $r(e){let t=ii(e);for(;Ur(t)&&!ti(t);){if(Qr(t))return t;if(qr(t))return null;t=ii(t)}return null}function ei(){return Zr??=typeof CSS<`u`&&CSS.supports&&CSS.supports(`-webkit-backdrop-filter`,`none`),Zr}function ti(e){return/^(html|body|#document)$/.test(zr(e))}function ni(e){return H(e).getComputedStyle(e)}function ri(e){return Hr(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function ii(e){if(zr(e)===`html`)return e;let t=e.assignedSlot||e.parentNode||Wr(e)&&e.host||Br(e);return Wr(t)?t.host:t}function ai(e){let t=ii(e);return ti(t)?e.ownerDocument?e.ownerDocument.body:e.body:Ur(t)&&Gr(t)?t:ai(t)}function oi(e,t,n){t===void 0&&(t=[]),n===void 0&&(n=!0);let r=ai(e),i=r===e.ownerDocument?.body,a=H(r);if(i){let e=si(a);return t.concat(a,a.visualViewport||[],Gr(r)?r:[],e&&n?oi(e):[])}else return t.concat(r,oi(r,[],n))}function si(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function ci(e){let t=ni(e),n=parseFloat(t.width)||0,r=parseFloat(t.height)||0,i=Ur(e),a=i?e.offsetWidth:n,o=i?e.offsetHeight:r,s=nr(n)!==a||nr(r)!==o;return s&&(n=a,r=o),{width:n,height:r,$:s}}function li(e){return Hr(e)?e:e.contextElement}function ui(e){let t=li(e);if(!Ur(t))return ir(1);let n=t.getBoundingClientRect(),{width:r,height:i,$:a}=ci(t),o=(a?nr(n.width):n.width)/r,s=(a?nr(n.height):n.height)/i;return(!o||!Number.isFinite(o))&&(o=1),(!s||!Number.isFinite(s))&&(s=1),{x:o,y:s}}var di=ir(0);function fi(e){let t=H(e);return!ei()||!t.visualViewport?di:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function pi(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==H(e)?!1:t}function mi(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);let i=e.getBoundingClientRect(),a=li(e),o=ir(1);t&&(r?Hr(r)&&(o=ui(r)):o=ui(e));let s=pi(a,n,r)?fi(a):ir(0),c=(i.left+s.x)/o.x,l=(i.top+s.y)/o.y,u=i.width/o.x,d=i.height/o.y;if(a){let e=H(a),t=r&&Hr(r)?H(r):r,n=e,i=si(n);for(;i&&r&&t!==n;){let e=ui(i),t=i.getBoundingClientRect(),r=ni(i),a=t.left+(i.clientLeft+parseFloat(r.paddingLeft))*e.x,o=t.top+(i.clientTop+parseFloat(r.paddingTop))*e.y;c*=e.x,l*=e.y,u*=e.x,d*=e.y,c+=a,l+=o,n=H(i),i=si(n)}}return Er({width:u,height:d,x:c,y:l})}function hi(e,t){let n=ri(e).scrollLeft;return t?t.left+n:mi(Br(e)).left+n}function gi(e,t){let n=e.getBoundingClientRect();return{x:n.left+t.scrollLeft-hi(e,n),y:n.top+t.scrollTop}}function _i(e){let{elements:t,rect:n,offsetParent:r,strategy:i}=e,a=i===`fixed`,o=Br(r),s=t?qr(t.floating):!1;if(r===o||s&&a)return n;let c={scrollLeft:0,scrollTop:0},l=ir(1),u=ir(0),d=Ur(r);if((d||!d&&!a)&&((zr(r)!==`body`||Gr(o))&&(c=ri(r)),d)){let e=mi(r);l=ui(r),u.x=e.x+r.clientLeft,u.y=e.y+r.clientTop}let f=o&&!d&&!a?gi(o,c):ir(0);return{width:n.width*l.x,height:n.height*l.y,x:n.x*l.x-c.scrollLeft*l.x+u.x+f.x,y:n.y*l.y-c.scrollTop*l.y+u.y+f.y}}function vi(e){return Array.from(e.getClientRects())}function yi(e){let t=Br(e),n=ri(e),r=e.ownerDocument.body,i=V(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),a=V(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight),o=-n.scrollLeft+hi(e),s=-n.scrollTop;return ni(r).direction===`rtl`&&(o+=V(t.clientWidth,r.clientWidth)-i),{width:i,height:a,x:o,y:s}}var bi=25;function xi(e,t){let n=H(e),r=Br(e),i=n.visualViewport,a=r.clientWidth,o=r.clientHeight,s=0,c=0;if(i){a=i.width,o=i.height;let e=ei();(!e||e&&t===`fixed`)&&(s=i.offsetLeft,c=i.offsetTop)}let l=hi(r);if(l<=0){let e=r.ownerDocument,t=e.body,n=getComputedStyle(t),i=e.compatMode===`CSS1Compat`&&parseFloat(n.marginLeft)+parseFloat(n.marginRight)||0,o=Math.abs(r.clientWidth-t.clientWidth-i);o<=bi&&(a-=o)}else l<=bi&&(a+=l);return{width:a,height:o,x:s,y:c}}function Si(e,t){let n=mi(e,!0,t===`fixed`),r=n.top+e.clientTop,i=n.left+e.clientLeft,a=Ur(e)?ui(e):ir(1);return{width:e.clientWidth*a.x,height:e.clientHeight*a.y,x:i*a.x,y:r*a.y}}function Ci(e,t,n){let r;if(t===`viewport`)r=xi(e,n);else if(t===`document`)r=yi(Br(e));else if(Hr(t))r=Si(t,n);else{let n=fi(e);r={x:t.x-n.x,y:t.y-n.y,width:t.width,height:t.height}}return Er(r)}function wi(e,t){let n=ii(e);return n===t||!Hr(n)||ti(n)?!1:ni(n).position===`fixed`||wi(n,t)}function Ti(e,t){let n=t.get(e);if(n)return n;let r=oi(e,[],!1).filter(e=>Hr(e)&&zr(e)!==`body`),i=null,a=ni(e).position===`fixed`,o=a?ii(e):e;for(;Hr(o)&&!ti(o);){let t=ni(o),n=Qr(o);!n&&t.position===`fixed`&&(i=null),(a?!n&&!i:!n&&t.position===`static`&&i&&(i.position===`absolute`||i.position===`fixed`)||Gr(o)&&!n&&wi(e,o))?r=r.filter(e=>e!==o):i=t,o=ii(o)}return t.set(e,r),r}function Ei(e){let{element:t,boundary:n,rootBoundary:r,strategy:i}=e,a=[...n===`clippingAncestors`?qr(t)?[]:Ti(t,this._c):[].concat(n),r],o=Ci(t,a[0],i),s=o.top,c=o.right,l=o.bottom,u=o.left;for(let e=1;e<a.length;e++){let n=Ci(t,a[e],i);s=V(n.top,s),c=tr(n.right,c),l=tr(n.bottom,l),u=V(n.left,u)}return{width:c-u,height:l-s,x:u,y:s}}function Di(e){let{width:t,height:n}=ci(e);return{width:t,height:n}}function Oi(e,t,n){let r=Ur(t),i=Br(t),a=n===`fixed`,o=mi(e,!0,a,t),s={scrollLeft:0,scrollTop:0},c=ir(0);function l(){c.x=hi(i)}if(r||!r&&!a)if((zr(t)!==`body`||Gr(i))&&(s=ri(t)),r){let e=mi(t,!0,a,t);c.x=e.x+t.clientLeft,c.y=e.y+t.clientTop}else i&&l();a&&!r&&i&&l();let u=i&&!r&&!a?gi(i,s):ir(0);return{x:o.left+s.scrollLeft-c.x-u.x,y:o.top+s.scrollTop-c.y-u.y,width:o.width,height:o.height}}function ki(e){return ni(e).position===`static`}function Ai(e,t){if(!Ur(e)||ni(e).position===`fixed`)return null;if(t)return t(e);let n=e.offsetParent;return Br(e)===n&&(n=n.ownerDocument.body),n}function ji(e,t){let n=H(e);if(qr(e))return n;if(!Ur(e)){let t=ii(e);for(;t&&!ti(t);){if(Hr(t)&&!ki(t))return t;t=ii(t)}return n}let r=Ai(e,t);for(;r&&Kr(r)&&ki(r);)r=Ai(r,t);return r&&ti(r)&&ki(r)&&!Qr(r)?n:r||$r(e)||n}var Mi=async function(e){let t=this.getOffsetParent||ji,n=this.getDimensions,r=await n(e.floating);return{reference:Oi(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}};function Ni(e){return ni(e).direction===`rtl`}var Pi={convertOffsetParentRelativeRectToViewportRelativeRect:_i,getDocumentElement:Br,getClippingRect:Ei,getOffsetParent:ji,getElementRects:Mi,getClientRects:vi,getDimensions:Di,getScale:ui,isElement:Hr,isRTL:Ni};function Fi(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function Ii(e,t){let n=null,r,i=Br(e);function a(){var e;clearTimeout(r),(e=n)==null||e.disconnect(),n=null}function o(s,c){s===void 0&&(s=!1),c===void 0&&(c=1),a();let l=e.getBoundingClientRect(),{left:u,top:d,width:f,height:p}=l;if(s||t(),!f||!p)return;let m=rr(d),h=rr(i.clientWidth-(u+f)),g=rr(i.clientHeight-(d+p)),_=rr(u),ee={rootMargin:-m+`px `+-h+`px `+-g+`px `+-_+`px`,threshold:V(0,tr(1,c))||1},v=!0;function te(t){let n=t[0].intersectionRatio;if(n!==c){if(!v)return o();n?o(!1,n):r=setTimeout(()=>{o(!1,1e-7)},1e3)}n===1&&!Fi(l,e.getBoundingClientRect())&&o(),v=!1}try{n=new IntersectionObserver(te,{...ee,root:i.ownerDocument})}catch{n=new IntersectionObserver(te,ee)}n.observe(e)}return o(!0),a}function Li(e,t,n,r){r===void 0&&(r={});let{ancestorScroll:i=!0,ancestorResize:a=!0,elementResize:o=typeof ResizeObserver==`function`,layoutShift:s=typeof IntersectionObserver==`function`,animationFrame:c=!1}=r,l=li(e),u=i||a?[...l?oi(l):[],...t?oi(t):[]]:[];u.forEach(e=>{i&&e.addEventListener(`scroll`,n,{passive:!0}),a&&e.addEventListener(`resize`,n)});let d=l&&s?Ii(l,n):null,f=-1,p=null;o&&(p=new ResizeObserver(e=>{let[r]=e;r&&r.target===l&&p&&t&&(p.unobserve(t),cancelAnimationFrame(f),f=requestAnimationFrame(()=>{var e;(e=p)==null||e.observe(t)})),n()}),l&&!c&&p.observe(l),t&&p.observe(t));let m,h=c?mi(e):null;c&&g();function g(){let t=mi(e);h&&!Fi(h,t)&&n(),h=t,m=requestAnimationFrame(g)}return n(),()=>{var e;u.forEach(e=>{i&&e.removeEventListener(`scroll`,n),a&&e.removeEventListener(`resize`,n)}),d?.(),(e=p)==null||e.disconnect(),p=null,c&&cancelAnimationFrame(m)}}var Ri=Fr,zi=Ir,Bi=Mr,Vi=Lr,Hi=jr,Ui=(e,t,n)=>{let r=new Map,i={platform:Pi,...n},a={...i.platform,_c:r};return Ar(e,t,{...i,platform:a})};function Wi(e){return Ki(e)}function Gi(e){return e.assignedSlot?e.assignedSlot:e.parentNode instanceof ShadowRoot?e.parentNode.host:e.parentNode}function Ki(e){for(let t=e;t;t=Gi(t))if(t instanceof Element&&getComputedStyle(t).display===`none`)return null;for(let t=Gi(e);t;t=Gi(t)){if(!(t instanceof Element))continue;let e=getComputedStyle(t);if(e.display!==`contents`&&(e.position!==`static`||Qr(e)||t.tagName===`BODY`))return t}return null}function qi(e){return typeof e==`object`&&!!e&&`getBoundingClientRect`in e&&(`contextElement`in e?e.contextElement instanceof Element:!0)}var U=class extends N{constructor(){super(...arguments),this.localize=new cn(this),this.active=!1,this.placement=`top`,this.strategy=`absolute`,this.distance=0,this.skidding=0,this.arrow=!1,this.arrowPlacement=`anchor`,this.arrowPadding=10,this.flip=!1,this.flipFallbackPlacements=``,this.flipFallbackStrategy=`best-fit`,this.flipPadding=0,this.shift=!1,this.shiftPadding=0,this.autoSizePadding=0,this.hoverBridge=!1,this.updateHoverBridge=()=>{if(this.hoverBridge&&this.anchorEl){let e=this.anchorEl.getBoundingClientRect(),t=this.popup.getBoundingClientRect(),n=this.placement.includes(`top`)||this.placement.includes(`bottom`),r=0,i=0,a=0,o=0,s=0,c=0,l=0,u=0;n?e.top<t.top?(r=e.left,i=e.bottom,a=e.right,o=e.bottom,s=t.left,c=t.top,l=t.right,u=t.top):(r=t.left,i=t.bottom,a=t.right,o=t.bottom,s=e.left,c=e.top,l=e.right,u=e.top):e.left<t.left?(r=e.right,i=e.top,a=t.left,o=t.top,s=e.right,c=e.bottom,l=t.left,u=t.bottom):(r=t.right,i=t.top,a=e.left,o=e.top,s=t.right,c=t.bottom,l=e.left,u=e.bottom),this.style.setProperty(`--hover-bridge-top-left-x`,`${r}px`),this.style.setProperty(`--hover-bridge-top-left-y`,`${i}px`),this.style.setProperty(`--hover-bridge-top-right-x`,`${a}px`),this.style.setProperty(`--hover-bridge-top-right-y`,`${o}px`),this.style.setProperty(`--hover-bridge-bottom-left-x`,`${s}px`),this.style.setProperty(`--hover-bridge-bottom-left-y`,`${c}px`),this.style.setProperty(`--hover-bridge-bottom-right-x`,`${l}px`),this.style.setProperty(`--hover-bridge-bottom-right-y`,`${u}px`)}}}async connectedCallback(){super.connectedCallback(),await this.updateComplete,this.start()}disconnectedCallback(){super.disconnectedCallback(),this.stop()}async updated(e){super.updated(e),e.has(`active`)&&(this.active?this.start():this.stop()),e.has(`anchor`)&&this.handleAnchorChange(),this.active&&(await this.updateComplete,this.reposition())}async handleAnchorChange(){if(await this.stop(),this.anchor&&typeof this.anchor==`string`){let e=this.getRootNode();this.anchorEl=e.getElementById(this.anchor)}else this.anchor instanceof Element||qi(this.anchor)?this.anchorEl=this.anchor:this.anchorEl=this.querySelector(`[slot="anchor"]`);this.anchorEl instanceof HTMLSlotElement&&(this.anchorEl=this.anchorEl.assignedElements({flatten:!0})[0]),this.anchorEl&&this.active&&this.start()}start(){!this.anchorEl||!this.active||(this.cleanup=Li(this.anchorEl,this.popup,()=>{this.reposition()}))}async stop(){return new Promise(e=>{this.cleanup?(this.cleanup(),this.cleanup=void 0,this.removeAttribute(`data-current-placement`),this.style.removeProperty(`--auto-size-available-width`),this.style.removeProperty(`--auto-size-available-height`),requestAnimationFrame(()=>e())):e()})}reposition(){if(!this.active||!this.anchorEl)return;let e=[Ri({mainAxis:this.distance,crossAxis:this.skidding})];this.sync?e.push(Vi({apply:({rects:e})=>{let t=this.sync===`width`||this.sync===`both`,n=this.sync===`height`||this.sync===`both`;this.popup.style.width=t?`${e.reference.width}px`:``,this.popup.style.height=n?`${e.reference.height}px`:``}})):(this.popup.style.width=``,this.popup.style.height=``),this.flip&&e.push(Bi({boundary:this.flipBoundary,fallbackPlacements:this.flipFallbackPlacements,fallbackStrategy:this.flipFallbackStrategy===`best-fit`?`bestFit`:`initialPlacement`,padding:this.flipPadding})),this.shift&&e.push(zi({boundary:this.shiftBoundary,padding:this.shiftPadding})),this.autoSize?e.push(Vi({boundary:this.autoSizeBoundary,padding:this.autoSizePadding,apply:({availableWidth:e,availableHeight:t})=>{this.autoSize===`vertical`||this.autoSize===`both`?this.style.setProperty(`--auto-size-available-height`,`${t}px`):this.style.removeProperty(`--auto-size-available-height`),this.autoSize===`horizontal`||this.autoSize===`both`?this.style.setProperty(`--auto-size-available-width`,`${e}px`):this.style.removeProperty(`--auto-size-available-width`)}})):(this.style.removeProperty(`--auto-size-available-width`),this.style.removeProperty(`--auto-size-available-height`)),this.arrow&&e.push(Hi({element:this.arrowEl,padding:this.arrowPadding}));let t=this.strategy===`absolute`?e=>Pi.getOffsetParent(e,Wi):Pi.getOffsetParent;Ui(this.anchorEl,this.popup,{placement:this.placement,middleware:e,strategy:this.strategy,platform:ut(lt({},Pi),{getOffsetParent:t})}).then(({x:e,y:t,middlewareData:n,placement:r})=>{let i=this.localize.dir()===`rtl`,a={top:`bottom`,right:`left`,bottom:`top`,left:`right`}[r.split(`-`)[0]];if(this.setAttribute(`data-current-placement`,r),Object.assign(this.popup.style,{left:`${e}px`,top:`${t}px`}),this.arrow){let e=n.arrow.x,t=n.arrow.y,r=``,o=``,s=``,c=``;if(this.arrowPlacement===`start`){let n=typeof e==`number`?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:``;r=typeof t==`number`?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:``,o=i?n:``,c=i?``:n}else if(this.arrowPlacement===`end`){let n=typeof e==`number`?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:``;o=i?``:n,c=i?n:``,s=typeof t==`number`?`calc(${this.arrowPadding}px - var(--arrow-padding-offset))`:``}else this.arrowPlacement===`center`?(c=typeof e==`number`?`calc(50% - var(--arrow-size-diagonal))`:``,r=typeof t==`number`?`calc(50% - var(--arrow-size-diagonal))`:``):(c=typeof e==`number`?`${e}px`:``,r=typeof t==`number`?`${t}px`:``);Object.assign(this.arrowEl.style,{top:r,right:o,bottom:s,left:c,[a]:`calc(var(--arrow-size-diagonal) * -1)`})}}),requestAnimationFrame(()=>this.updateHoverBridge()),this.emit(`sl-reposition`)}render(){return w`
      <slot name="anchor" @slotchange=${this.handleAnchorChange}></slot>

      <span
        part="hover-bridge"
        class=${F({"popup-hover-bridge":!0,"popup-hover-bridge--visible":this.hoverBridge&&this.active})}
      ></span>

      <div
        part="popup"
        class=${F({popup:!0,"popup--active":this.active,"popup--fixed":this.strategy===`fixed`,"popup--has-arrow":this.arrow})}
      >
        <slot></slot>
        ${this.arrow?w`<div part="arrow" class="popup__arrow" role="presentation"></div>`:``}
      </div>
    `}};U.styles=[k,er],D([M(`.popup`)],U.prototype,`popup`,2),D([M(`.popup__arrow`)],U.prototype,`arrowEl`,2),D([A()],U.prototype,`anchor`,2),D([A({type:Boolean,reflect:!0})],U.prototype,`active`,2),D([A({reflect:!0})],U.prototype,`placement`,2),D([A({reflect:!0})],U.prototype,`strategy`,2),D([A({type:Number})],U.prototype,`distance`,2),D([A({type:Number})],U.prototype,`skidding`,2),D([A({type:Boolean})],U.prototype,`arrow`,2),D([A({attribute:`arrow-placement`})],U.prototype,`arrowPlacement`,2),D([A({attribute:`arrow-padding`,type:Number})],U.prototype,`arrowPadding`,2),D([A({type:Boolean})],U.prototype,`flip`,2),D([A({attribute:`flip-fallback-placements`,converter:{fromAttribute:e=>e.split(` `).map(e=>e.trim()).filter(e=>e!==``),toAttribute:e=>e.join(` `)}})],U.prototype,`flipFallbackPlacements`,2),D([A({attribute:`flip-fallback-strategy`})],U.prototype,`flipFallbackStrategy`,2),D([A({type:Object})],U.prototype,`flipBoundary`,2),D([A({attribute:`flip-padding`,type:Number})],U.prototype,`flipPadding`,2),D([A({type:Boolean})],U.prototype,`shift`,2),D([A({type:Object})],U.prototype,`shiftBoundary`,2),D([A({attribute:`shift-padding`,type:Number})],U.prototype,`shiftPadding`,2),D([A({attribute:`auto-size`})],U.prototype,`autoSize`,2),D([A()],U.prototype,`sync`,2),D([A({type:Object})],U.prototype,`autoSizeBoundary`,2),D([A({attribute:`auto-size-padding`,type:Number})],U.prototype,`autoSizePadding`,2),D([A({attribute:`hover-bridge`,type:Boolean})],U.prototype,`hoverBridge`,2);var Ji=class extends Mt{constructor(e){if(super(e),this.it=E,e.type!==At.CHILD)throw Error(this.constructor.directiveName+`() can only be used in child bindings`)}render(e){if(e===E||e==null)return this._t=void 0,this.it=e;if(e===T)return e;if(typeof e!=`string`)throw Error(this.constructor.directiveName+`() called with a non-string value`);if(e===this.it)return this._t;this.it=e;let t=[e];return t.raw=t,this._t={_$litType$:this.constructor.resultType,strings:t,values:[]}}};Ji.directiveName=`unsafeHTML`,Ji.resultType=1;var Yi=jt(Ji),W=class extends N{constructor(){super(...arguments),this.formControlController=new bn(this,{assumeInteractionOn:[`sl-blur`,`sl-input`]}),this.hasSlotController=new Yt(this,`help-text`,`label`),this.localize=new cn(this),this.typeToSelectString=``,this.hasFocus=!1,this.displayLabel=``,this.selectedOptions=[],this.valueHasChanged=!1,this.name=``,this._value=``,this.defaultValue=``,this.size=`medium`,this.placeholder=``,this.multiple=!1,this.maxOptionsVisible=3,this.disabled=!1,this.clearable=!1,this.open=!1,this.hoist=!1,this.filled=!1,this.pill=!1,this.label=``,this.placement=`bottom`,this.helpText=``,this.form=``,this.required=!1,this.getTag=e=>w`
      <sl-tag
        part="tag"
        exportparts="
              base:tag__base,
              content:tag__content,
              remove-button:tag__remove-button,
              remove-button__base:tag__remove-button__base
            "
        ?pill=${this.pill}
        size=${this.size}
        removable
        @sl-remove=${t=>this.handleTagRemove(t,e)}
      >
        ${e.getTextLabel()}
      </sl-tag>
    `,this.handleDocumentFocusIn=e=>{let t=e.composedPath();this&&!t.includes(this)&&this.hide()},this.handleDocumentKeyDown=e=>{let t=e.target,n=t.closest(`.select__clear`)!==null,r=t.closest(`sl-icon-button`)!==null;if(!(n||r)){if(e.key===`Escape`&&this.open&&!this.closeWatcher&&(e.preventDefault(),e.stopPropagation(),this.hide(),this.displayInput.focus({preventScroll:!0})),e.key===`Enter`||e.key===` `&&this.typeToSelectString===``){if(e.preventDefault(),e.stopImmediatePropagation(),!this.open){this.show();return}this.currentOption&&!this.currentOption.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(this.currentOption):this.setSelectedOptions(this.currentOption),this.updateComplete.then(()=>{this.emit(`sl-input`),this.emit(`sl-change`)}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})));return}if([`ArrowUp`,`ArrowDown`,`Home`,`End`].includes(e.key)){let t=this.getAllOptions(),n=t.indexOf(this.currentOption),r=Math.max(0,n);if(e.preventDefault(),!this.open&&(this.show(),this.currentOption))return;e.key===`ArrowDown`?(r=n+1,r>t.length-1&&(r=0)):e.key===`ArrowUp`?(r=n-1,r<0&&(r=t.length-1)):e.key===`Home`?r=0:e.key===`End`&&(r=t.length-1),this.setCurrentOption(t[r])}if(e.key&&e.key.length===1||e.key===`Backspace`){let t=this.getAllOptions();if(e.metaKey||e.ctrlKey||e.altKey)return;if(!this.open){if(e.key===`Backspace`)return;this.show()}e.stopPropagation(),e.preventDefault(),clearTimeout(this.typeToSelectTimeout),this.typeToSelectTimeout=window.setTimeout(()=>this.typeToSelectString=``,1e3),e.key===`Backspace`?this.typeToSelectString=this.typeToSelectString.slice(0,-1):this.typeToSelectString+=e.key.toLowerCase();for(let e of t)if(e.getTextLabel().toLowerCase().startsWith(this.typeToSelectString)){this.setCurrentOption(e);break}}}},this.handleDocumentMouseDown=e=>{let t=e.composedPath();this&&!t.includes(this)&&this.hide()}}get value(){return this._value}set value(e){e=this.multiple?Array.isArray(e)?e:e.split(` `):Array.isArray(e)?e.join(` `):e,this._value!==e&&(this.valueHasChanged=!0,this._value=e)}get validity(){return this.valueInput.validity}get validationMessage(){return this.valueInput.validationMessage}connectedCallback(){super.connectedCallback(),setTimeout(()=>{this.handleDefaultSlotChange()}),this.open=!1}addOpenListeners(){var e;document.addEventListener(`focusin`,this.handleDocumentFocusIn),document.addEventListener(`keydown`,this.handleDocumentKeyDown),document.addEventListener(`mousedown`,this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().addEventListener(`focusin`,this.handleDocumentFocusIn),`CloseWatcher`in window&&((e=this.closeWatcher)==null||e.destroy(),this.closeWatcher=new CloseWatcher,this.closeWatcher.onclose=()=>{this.open&&(this.hide(),this.displayInput.focus({preventScroll:!0}))})}removeOpenListeners(){var e;document.removeEventListener(`focusin`,this.handleDocumentFocusIn),document.removeEventListener(`keydown`,this.handleDocumentKeyDown),document.removeEventListener(`mousedown`,this.handleDocumentMouseDown),this.getRootNode()!==document&&this.getRootNode().removeEventListener(`focusin`,this.handleDocumentFocusIn),(e=this.closeWatcher)==null||e.destroy()}handleFocus(){this.hasFocus=!0,this.displayInput.setSelectionRange(0,0),this.emit(`sl-focus`)}handleBlur(){this.hasFocus=!1,this.emit(`sl-blur`)}handleLabelClick(){this.displayInput.focus()}handleComboboxMouseDown(e){let t=e.composedPath().some(e=>e instanceof Element&&e.tagName.toLowerCase()===`sl-icon-button`);this.disabled||t||(e.preventDefault(),this.displayInput.focus({preventScroll:!0}),this.open=!this.open)}handleComboboxKeyDown(e){e.key!==`Tab`&&(e.stopPropagation(),this.handleDocumentKeyDown(e))}handleClearClick(e){e.stopPropagation(),this.valueHasChanged=!0,this.value!==``&&(this.setSelectedOptions([]),this.displayInput.focus({preventScroll:!0}),this.updateComplete.then(()=>{this.emit(`sl-clear`),this.emit(`sl-input`),this.emit(`sl-change`)}))}handleClearMouseDown(e){e.stopPropagation(),e.preventDefault()}handleOptionClick(e){let t=e.target.closest(`sl-option`),n=this.value;t&&!t.disabled&&(this.valueHasChanged=!0,this.multiple?this.toggleOptionSelection(t):this.setSelectedOptions(t),this.updateComplete.then(()=>this.displayInput.focus({preventScroll:!0})),this.value!==n&&this.updateComplete.then(()=>{this.emit(`sl-input`),this.emit(`sl-change`)}),this.multiple||(this.hide(),this.displayInput.focus({preventScroll:!0})))}handleDefaultSlotChange(){customElements.get(`sl-option`)||customElements.whenDefined(`sl-option`).then(()=>this.handleDefaultSlotChange());let e=this.getAllOptions(),t=this.valueHasChanged?this.value:this.defaultValue,n=Array.isArray(t)?t:[t],r=[];e.forEach(e=>r.push(e.value)),this.setSelectedOptions(e.filter(e=>n.includes(e.value)))}handleTagRemove(e,t){e.stopPropagation(),this.valueHasChanged=!0,this.disabled||(this.toggleOptionSelection(t,!1),this.updateComplete.then(()=>{this.emit(`sl-input`),this.emit(`sl-change`)}))}getAllOptions(){return[...this.querySelectorAll(`sl-option`)]}getFirstOption(){return this.querySelector(`sl-option`)}setCurrentOption(e){this.getAllOptions().forEach(e=>{e.current=!1,e.tabIndex=-1}),e&&(this.currentOption=e,e.current=!0,e.tabIndex=0,e.focus())}setSelectedOptions(e){let t=this.getAllOptions(),n=Array.isArray(e)?e:[e];t.forEach(e=>e.selected=!1),n.length&&n.forEach(e=>e.selected=!0),this.selectionChanged()}toggleOptionSelection(e,t){t===!0||t===!1?e.selected=t:e.selected=!e.selected,this.selectionChanged()}selectionChanged(){let e=this.getAllOptions();this.selectedOptions=e.filter(e=>e.selected);let t=this.valueHasChanged;if(this.multiple)this.value=this.selectedOptions.map(e=>e.value),this.placeholder&&this.value.length===0?this.displayLabel=``:this.displayLabel=this.localize.term(`numOptionsSelected`,this.selectedOptions.length);else{let e=this.selectedOptions[0];this.value=e?.value??``,this.displayLabel=(e?.getTextLabel)?.call(e)??``}this.valueHasChanged=t,this.updateComplete.then(()=>{this.formControlController.updateValidity()})}get tags(){return this.selectedOptions.map((e,t)=>{if(t<this.maxOptionsVisible||this.maxOptionsVisible<=0){let n=this.getTag(e,t);return w`<div @sl-remove=${t=>this.handleTagRemove(t,e)}>
          ${typeof n==`string`?Yi(n):n}
        </div>`}else if(t===this.maxOptionsVisible)return w`<sl-tag size=${this.size}>+${this.selectedOptions.length-t}</sl-tag>`;return w``})}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleDisabledChange(){this.disabled&&(this.open=!1,this.handleOpenChange())}attributeChangedCallback(e,t,n){if(super.attributeChangedCallback(e,t,n),e===`value`){let e=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=e}}handleValueChange(){if(!this.valueHasChanged){let e=this.valueHasChanged;this.value=this.defaultValue,this.valueHasChanged=e}let e=this.getAllOptions(),t=Array.isArray(this.value)?this.value:[this.value];this.setSelectedOptions(e.filter(e=>t.includes(e.value)))}async handleOpenChange(){if(this.open&&!this.disabled){this.setCurrentOption(this.selectedOptions[0]||this.getFirstOption()),this.emit(`sl-show`),this.addOpenListeners(),await qt(this),this.listbox.hidden=!1,this.popup.active=!0,requestAnimationFrame(()=>{this.setCurrentOption(this.currentOption)});let{keyframes:e,options:t}=Ut(this,`select.show`,{dir:this.localize.dir()});await Gt(this.popup.popup,e,t),this.currentOption&&Hn(this.currentOption,this.listbox,`vertical`,`auto`),this.emit(`sl-after-show`)}else{this.emit(`sl-hide`),this.removeOpenListeners(),await qt(this);let{keyframes:e,options:t}=Ut(this,`select.hide`,{dir:this.localize.dir()});await Gt(this.popup.popup,e,t),this.listbox.hidden=!0,this.popup.active=!1,this.emit(`sl-after-hide`)}}async show(){if(this.open||this.disabled){this.open=!1;return}return this.open=!0,Wt(this,`sl-after-show`)}async hide(){if(!this.open||this.disabled){this.open=!1;return}return this.open=!1,Wt(this,`sl-after-hide`)}checkValidity(){return this.valueInput.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.valueInput.reportValidity()}setCustomValidity(e){this.valueInput.setCustomValidity(e),this.formControlController.updateValidity()}focus(e){this.displayInput.focus(e)}blur(){this.displayInput.blur()}render(){let e=this.hasSlotController.test(`label`),t=this.hasSlotController.test(`help-text`),n=this.label?!0:!!e,r=this.helpText?!0:!!t,i=this.clearable&&!this.disabled&&this.value.length>0,a=this.placeholder&&this.value&&this.value.length<=0;return w`
      <div
        part="form-control"
        class=${F({"form-control":!0,"form-control--small":this.size===`small`,"form-control--medium":this.size===`medium`,"form-control--large":this.size===`large`,"form-control--has-label":n,"form-control--has-help-text":r})}
      >
        <label
          id="label"
          part="form-control-label"
          class="form-control__label"
          aria-hidden=${n?`false`:`true`}
          @click=${this.handleLabelClick}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <sl-popup
            class=${F({select:!0,"select--standard":!0,"select--filled":this.filled,"select--pill":this.pill,"select--open":this.open,"select--disabled":this.disabled,"select--multiple":this.multiple,"select--focused":this.hasFocus,"select--placeholder-visible":a,"select--top":this.placement===`top`,"select--bottom":this.placement===`bottom`,"select--small":this.size===`small`,"select--medium":this.size===`medium`,"select--large":this.size===`large`})}
            placement=${this.placement}
            strategy=${this.hoist?`fixed`:`absolute`}
            flip
            shift
            sync="width"
            auto-size="vertical"
            auto-size-padding="10"
          >
            <div
              part="combobox"
              class="select__combobox"
              slot="anchor"
              @keydown=${this.handleComboboxKeyDown}
              @mousedown=${this.handleComboboxMouseDown}
            >
              <slot part="prefix" name="prefix" class="select__prefix"></slot>

              <input
                part="display-input"
                class="select__display-input"
                type="text"
                placeholder=${this.placeholder}
                .disabled=${this.disabled}
                .value=${this.displayLabel}
                autocomplete="off"
                spellcheck="false"
                autocapitalize="off"
                readonly
                aria-controls="listbox"
                aria-expanded=${this.open?`true`:`false`}
                aria-haspopup="listbox"
                aria-labelledby="label"
                aria-disabled=${this.disabled?`true`:`false`}
                aria-describedby="help-text"
                role="combobox"
                tabindex="0"
                @focus=${this.handleFocus}
                @blur=${this.handleBlur}
              />

              ${this.multiple?w`<div part="tags" class="select__tags">${this.tags}</div>`:``}

              <input
                class="select__value-input"
                type="text"
                ?disabled=${this.disabled}
                ?required=${this.required}
                .value=${Array.isArray(this.value)?this.value.join(`, `):this.value}
                tabindex="-1"
                aria-hidden="true"
                @focus=${()=>this.focus()}
                @invalid=${this.handleInvalid}
              />

              ${i?w`
                    <button
                      part="clear-button"
                      class="select__clear"
                      type="button"
                      aria-label=${this.localize.term(`clearEntry`)}
                      @mousedown=${this.handleClearMouseDown}
                      @click=${this.handleClearClick}
                      tabindex="-1"
                    >
                      <slot name="clear-icon">
                        <sl-icon name="x-circle-fill" library="system"></sl-icon>
                      </slot>
                    </button>
                  `:``}

              <slot name="suffix" part="suffix" class="select__suffix"></slot>

              <slot name="expand-icon" part="expand-icon" class="select__expand-icon">
                <sl-icon library="system" name="chevron-down"></sl-icon>
              </slot>
            </div>

            <div
              id="listbox"
              role="listbox"
              aria-expanded=${this.open?`true`:`false`}
              aria-multiselectable=${this.multiple?`true`:`false`}
              aria-labelledby="label"
              part="listbox"
              class="select__listbox"
              tabindex="-1"
              @mouseup=${this.handleOptionClick}
              @slotchange=${this.handleDefaultSlotChange}
            >
              <slot></slot>
            </div>
          </sl-popup>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${r?`false`:`true`}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};W.styles=[k,qn,$n],W.dependencies={"sl-icon":P,"sl-popup":U,"sl-tag":Qn},D([M(`.select`)],W.prototype,`popup`,2),D([M(`.select__combobox`)],W.prototype,`combobox`,2),D([M(`.select__display-input`)],W.prototype,`displayInput`,2),D([M(`.select__value-input`)],W.prototype,`valueInput`,2),D([M(`.select__listbox`)],W.prototype,`listbox`,2),D([j()],W.prototype,`hasFocus`,2),D([j()],W.prototype,`displayLabel`,2),D([j()],W.prototype,`currentOption`,2),D([j()],W.prototype,`selectedOptions`,2),D([j()],W.prototype,`valueHasChanged`,2),D([A()],W.prototype,`name`,2),D([j()],W.prototype,`value`,1),D([A({attribute:`value`})],W.prototype,`defaultValue`,2),D([A({reflect:!0})],W.prototype,`size`,2),D([A()],W.prototype,`placeholder`,2),D([A({type:Boolean,reflect:!0})],W.prototype,`multiple`,2),D([A({attribute:`max-options-visible`,type:Number})],W.prototype,`maxOptionsVisible`,2),D([A({type:Boolean,reflect:!0})],W.prototype,`disabled`,2),D([A({type:Boolean})],W.prototype,`clearable`,2),D([A({type:Boolean,reflect:!0})],W.prototype,`open`,2),D([A({type:Boolean})],W.prototype,`hoist`,2),D([A({type:Boolean,reflect:!0})],W.prototype,`filled`,2),D([A({type:Boolean,reflect:!0})],W.prototype,`pill`,2),D([A()],W.prototype,`label`,2),D([A({reflect:!0})],W.prototype,`placement`,2),D([A({attribute:`help-text`})],W.prototype,`helpText`,2),D([A({reflect:!0})],W.prototype,`form`,2),D([A({type:Boolean,reflect:!0})],W.prototype,`required`,2),D([A()],W.prototype,`getTag`,2),D([O(`disabled`,{waitUntilFirstUpdate:!0})],W.prototype,`handleDisabledChange`,1),D([O([`defaultValue`,`value`],{waitUntilFirstUpdate:!0})],W.prototype,`handleValueChange`,1),D([O(`open`,{waitUntilFirstUpdate:!0})],W.prototype,`handleOpenChange`,1),Ht(`select.show`,{keyframes:[{opacity:0,scale:.9},{opacity:1,scale:1}],options:{duration:100,easing:`ease`}}),Ht(`select.hide`,{keyframes:[{opacity:1,scale:1},{opacity:0,scale:.9}],options:{duration:100,easing:`ease`}}),W.define(`sl-select`);var Xi=s`
  :host {
    display: inline-block;
  }

  :host([size='small']) {
    --height: var(--sl-toggle-size-small);
    --thumb-size: calc(var(--sl-toggle-size-small) + 4px);
    --width: calc(var(--height) * 2);

    font-size: var(--sl-input-font-size-small);
  }

  :host([size='medium']) {
    --height: var(--sl-toggle-size-medium);
    --thumb-size: calc(var(--sl-toggle-size-medium) + 4px);
    --width: calc(var(--height) * 2);

    font-size: var(--sl-input-font-size-medium);
  }

  :host([size='large']) {
    --height: var(--sl-toggle-size-large);
    --thumb-size: calc(var(--sl-toggle-size-large) + 4px);
    --width: calc(var(--height) * 2);

    font-size: var(--sl-input-font-size-large);
  }

  .switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    font-family: var(--sl-input-font-family);
    font-size: inherit;
    font-weight: var(--sl-input-font-weight);
    color: var(--sl-input-label-color);
    vertical-align: middle;
    cursor: pointer;
  }

  .switch__control {
    flex: 0 0 auto;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--width);
    height: var(--height);
    background-color: var(--sl-color-neutral-400);
    border: solid var(--sl-input-border-width) var(--sl-color-neutral-400);
    border-radius: var(--height);
    transition:
      var(--sl-transition-fast) border-color,
      var(--sl-transition-fast) background-color;
  }

  .switch__control .switch__thumb {
    width: var(--thumb-size);
    height: var(--thumb-size);
    background-color: var(--sl-color-neutral-0);
    border-radius: 50%;
    border: solid var(--sl-input-border-width) var(--sl-color-neutral-400);
    translate: calc((var(--width) - var(--height)) / -2);
    transition:
      var(--sl-transition-fast) translate ease,
      var(--sl-transition-fast) background-color,
      var(--sl-transition-fast) border-color,
      var(--sl-transition-fast) box-shadow;
  }

  .switch__input {
    position: absolute;
    opacity: 0;
    padding: 0;
    margin: 0;
    pointer-events: none;
  }

  /* Hover */
  .switch:not(.switch--checked):not(.switch--disabled) .switch__control:hover {
    background-color: var(--sl-color-neutral-400);
    border-color: var(--sl-color-neutral-400);
  }

  .switch:not(.switch--checked):not(.switch--disabled) .switch__control:hover .switch__thumb {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-color-neutral-400);
  }

  /* Focus */
  .switch:not(.switch--checked):not(.switch--disabled) .switch__input:focus-visible ~ .switch__control {
    background-color: var(--sl-color-neutral-400);
    border-color: var(--sl-color-neutral-400);
  }

  .switch:not(.switch--checked):not(.switch--disabled) .switch__input:focus-visible ~ .switch__control .switch__thumb {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-color-primary-600);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  /* Checked */
  .switch--checked .switch__control {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
  }

  .switch--checked .switch__control .switch__thumb {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-color-primary-600);
    translate: calc((var(--width) - var(--height)) / 2);
  }

  /* Checked + hover */
  .switch.switch--checked:not(.switch--disabled) .switch__control:hover {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
  }

  .switch.switch--checked:not(.switch--disabled) .switch__control:hover .switch__thumb {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-color-primary-600);
  }

  /* Checked + focus */
  .switch.switch--checked:not(.switch--disabled) .switch__input:focus-visible ~ .switch__control {
    background-color: var(--sl-color-primary-600);
    border-color: var(--sl-color-primary-600);
  }

  .switch.switch--checked:not(.switch--disabled) .switch__input:focus-visible ~ .switch__control .switch__thumb {
    background-color: var(--sl-color-neutral-0);
    border-color: var(--sl-color-primary-600);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  /* Disabled */
  .switch--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .switch__label {
    display: inline-block;
    line-height: var(--height);
    margin-inline-start: 0.5em;
    user-select: none;
    -webkit-user-select: none;
  }

  :host([required]) .switch__label::after {
    content: var(--sl-input-required-content);
    color: var(--sl-input-required-content-color);
    margin-inline-start: var(--sl-input-required-content-offset);
  }

  @media (forced-colors: active) {
    .switch.switch--checked:not(.switch--disabled) .switch__control:hover .switch__thumb,
    .switch--checked .switch__control .switch__thumb {
      background-color: ButtonText;
    }
  }
`,G=class extends N{constructor(){super(...arguments),this.formControlController=new bn(this,{value:e=>e.checked?e.value||`on`:void 0,defaultValue:e=>e.defaultChecked,setValue:(e,t)=>e.checked=t}),this.hasSlotController=new Yt(this,`help-text`),this.hasFocus=!1,this.title=``,this.name=``,this.size=`medium`,this.disabled=!1,this.checked=!1,this.defaultChecked=!1,this.form=``,this.required=!1,this.helpText=``}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}firstUpdated(){this.formControlController.updateValidity()}handleBlur(){this.hasFocus=!1,this.emit(`sl-blur`)}handleInput(){this.emit(`sl-input`)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}handleClick(){this.checked=!this.checked,this.emit(`sl-change`)}handleFocus(){this.hasFocus=!0,this.emit(`sl-focus`)}handleKeyDown(e){e.key===`ArrowLeft`&&(e.preventDefault(),this.checked=!1,this.emit(`sl-change`),this.emit(`sl-input`)),e.key===`ArrowRight`&&(e.preventDefault(),this.checked=!0,this.emit(`sl-change`),this.emit(`sl-input`))}handleCheckedChange(){this.input.checked=this.checked,this.formControlController.updateValidity()}handleDisabledChange(){this.formControlController.setValidity(!0)}click(){this.input.click()}focus(e){this.input.focus(e)}blur(){this.input.blur()}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){let e=this.hasSlotController.test(`help-text`),t=this.helpText?!0:!!e;return w`
      <div
        class=${F({"form-control":!0,"form-control--small":this.size===`small`,"form-control--medium":this.size===`medium`,"form-control--large":this.size===`large`,"form-control--has-help-text":t})}
      >
        <label
          part="base"
          class=${F({switch:!0,"switch--checked":this.checked,"switch--disabled":this.disabled,"switch--focused":this.hasFocus,"switch--small":this.size===`small`,"switch--medium":this.size===`medium`,"switch--large":this.size===`large`})}
        >
          <input
            class="switch__input"
            type="checkbox"
            title=${this.title}
            name=${this.name}
            value=${I(this.value)}
            .checked=${Jn(this.checked)}
            .disabled=${this.disabled}
            .required=${this.required}
            role="switch"
            aria-checked=${this.checked?`true`:`false`}
            aria-describedby="help-text"
            @click=${this.handleClick}
            @input=${this.handleInput}
            @invalid=${this.handleInvalid}
            @blur=${this.handleBlur}
            @focus=${this.handleFocus}
            @keydown=${this.handleKeyDown}
          />

          <span part="control" class="switch__control">
            <span part="thumb" class="switch__thumb"></span>
          </span>

          <div part="label" class="switch__label">
            <slot></slot>
          </div>
        </label>

        <div
          aria-hidden=${t?`false`:`true`}
          class="form-control__help-text"
          id="help-text"
          part="form-control-help-text"
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};G.styles=[k,qn,Xi],D([M(`input[type="checkbox"]`)],G.prototype,`input`,2),D([j()],G.prototype,`hasFocus`,2),D([A()],G.prototype,`title`,2),D([A()],G.prototype,`name`,2),D([A()],G.prototype,`value`,2),D([A({reflect:!0})],G.prototype,`size`,2),D([A({type:Boolean,reflect:!0})],G.prototype,`disabled`,2),D([A({type:Boolean,reflect:!0})],G.prototype,`checked`,2),D([Kn(`checked`)],G.prototype,`defaultChecked`,2),D([A({reflect:!0})],G.prototype,`form`,2),D([A({type:Boolean,reflect:!0})],G.prototype,`required`,2),D([A({attribute:`help-text`})],G.prototype,`helpText`,2),D([O(`checked`,{waitUntilFirstUpdate:!0})],G.prototype,`handleCheckedChange`,1),D([O(`disabled`,{waitUntilFirstUpdate:!0})],G.prototype,`handleDisabledChange`,1),G.define(`sl-switch`);var Zi=s`
  :host {
    display: block;
  }

  .textarea {
    display: grid;
    align-items: center;
    position: relative;
    width: 100%;
    font-family: var(--sl-input-font-family);
    font-weight: var(--sl-input-font-weight);
    line-height: var(--sl-line-height-normal);
    letter-spacing: var(--sl-input-letter-spacing);
    vertical-align: middle;
    transition:
      var(--sl-transition-fast) color,
      var(--sl-transition-fast) border,
      var(--sl-transition-fast) box-shadow,
      var(--sl-transition-fast) background-color;
    cursor: text;
  }

  /* Standard textareas */
  .textarea--standard {
    background-color: var(--sl-input-background-color);
    border: solid var(--sl-input-border-width) var(--sl-input-border-color);
  }

  .textarea--standard:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-hover);
    border-color: var(--sl-input-border-color-hover);
  }
  .textarea--standard:hover:not(.textarea--disabled) .textarea__control {
    color: var(--sl-input-color-hover);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-background-color-focus);
    border-color: var(--sl-input-border-color-focus);
    color: var(--sl-input-color-focus);
    box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
  }

  .textarea--standard.textarea--focused:not(.textarea--disabled) .textarea__control {
    color: var(--sl-input-color-focus);
  }

  .textarea--standard.textarea--disabled {
    background-color: var(--sl-input-background-color-disabled);
    border-color: var(--sl-input-border-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea__control,
  .textarea__size-adjuster {
    grid-area: 1 / 1 / 2 / 2;
  }

  .textarea__size-adjuster {
    visibility: hidden;
    pointer-events: none;
    opacity: 0;
  }

  .textarea--standard.textarea--disabled .textarea__control {
    color: var(--sl-input-color-disabled);
  }

  .textarea--standard.textarea--disabled .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color-disabled);
  }

  /* Filled textareas */
  .textarea--filled {
    border: none;
    background-color: var(--sl-input-filled-background-color);
    color: var(--sl-input-color);
  }

  .textarea--filled:hover:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-hover);
  }

  .textarea--filled.textarea--focused:not(.textarea--disabled) {
    background-color: var(--sl-input-filled-background-color-focus);
    outline: var(--sl-focus-ring);
    outline-offset: var(--sl-focus-ring-offset);
  }

  .textarea--filled.textarea--disabled {
    background-color: var(--sl-input-filled-background-color-disabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .textarea__control {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: 1.4;
    color: var(--sl-input-color);
    border: none;
    background: none;
    box-shadow: none;
    cursor: inherit;
    -webkit-appearance: none;
  }

  .textarea__control::-webkit-search-decoration,
  .textarea__control::-webkit-search-cancel-button,
  .textarea__control::-webkit-search-results-button,
  .textarea__control::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  .textarea__control::placeholder {
    color: var(--sl-input-placeholder-color);
    user-select: none;
    -webkit-user-select: none;
  }

  .textarea__control:focus {
    outline: none;
  }

  /*
   * Size modifiers
   */

  .textarea--small {
    border-radius: var(--sl-input-border-radius-small);
    font-size: var(--sl-input-font-size-small);
  }

  .textarea--small .textarea__control {
    padding: 0.5em var(--sl-input-spacing-small);
  }

  .textarea--medium {
    border-radius: var(--sl-input-border-radius-medium);
    font-size: var(--sl-input-font-size-medium);
  }

  .textarea--medium .textarea__control {
    padding: 0.5em var(--sl-input-spacing-medium);
  }

  .textarea--large {
    border-radius: var(--sl-input-border-radius-large);
    font-size: var(--sl-input-font-size-large);
  }

  .textarea--large .textarea__control {
    padding: 0.5em var(--sl-input-spacing-large);
  }

  /*
   * Resize types
   */

  .textarea--resize-none .textarea__control {
    resize: none;
  }

  .textarea--resize-vertical .textarea__control {
    resize: vertical;
  }

  .textarea--resize-auto .textarea__control {
    height: auto;
    resize: none;
    overflow-y: hidden;
  }
`,K=class extends N{constructor(){super(...arguments),this.formControlController=new bn(this,{assumeInteractionOn:[`sl-blur`,`sl-input`]}),this.hasSlotController=new Yt(this,`help-text`,`label`),this.hasFocus=!1,this.title=``,this.name=``,this.value=``,this.size=`medium`,this.filled=!1,this.label=``,this.helpText=``,this.placeholder=``,this.rows=4,this.resize=`vertical`,this.disabled=!1,this.readonly=!1,this.form=``,this.required=!1,this.spellcheck=!0,this.defaultValue=``}get validity(){return this.input.validity}get validationMessage(){return this.input.validationMessage}connectedCallback(){super.connectedCallback(),this.resizeObserver=new ResizeObserver(()=>this.setTextareaHeight()),this.updateComplete.then(()=>{this.setTextareaHeight(),this.resizeObserver.observe(this.input)})}firstUpdated(){this.formControlController.updateValidity()}disconnectedCallback(){var e;super.disconnectedCallback(),this.input&&((e=this.resizeObserver)==null||e.unobserve(this.input))}handleBlur(){this.hasFocus=!1,this.emit(`sl-blur`)}handleChange(){this.value=this.input.value,this.setTextareaHeight(),this.emit(`sl-change`)}handleFocus(){this.hasFocus=!0,this.emit(`sl-focus`)}handleInput(){this.value=this.input.value,this.emit(`sl-input`)}handleInvalid(e){this.formControlController.setValidity(!1),this.formControlController.emitInvalidEvent(e)}setTextareaHeight(){this.resize===`auto`?(this.sizeAdjuster.style.height=`${this.input.clientHeight}px`,this.input.style.height=`auto`,this.input.style.height=`${this.input.scrollHeight}px`):this.input.style.height=``}handleDisabledChange(){this.formControlController.setValidity(this.disabled)}handleRowsChange(){this.setTextareaHeight()}async handleValueChange(){await this.updateComplete,this.formControlController.updateValidity(),this.setTextareaHeight()}focus(e){this.input.focus(e)}blur(){this.input.blur()}select(){this.input.select()}scrollPosition(e){if(e){typeof e.top==`number`&&(this.input.scrollTop=e.top),typeof e.left==`number`&&(this.input.scrollLeft=e.left);return}return{top:this.input.scrollTop,left:this.input.scrollTop}}setSelectionRange(e,t,n=`none`){this.input.setSelectionRange(e,t,n)}setRangeText(e,t,n,r=`preserve`){let i=t??this.input.selectionStart,a=n??this.input.selectionEnd;this.input.setRangeText(e,i,a,r),this.value!==this.input.value&&(this.value=this.input.value,this.setTextareaHeight())}checkValidity(){return this.input.checkValidity()}getForm(){return this.formControlController.getForm()}reportValidity(){return this.input.reportValidity()}setCustomValidity(e){this.input.setCustomValidity(e),this.formControlController.updateValidity()}render(){let e=this.hasSlotController.test(`label`),t=this.hasSlotController.test(`help-text`),n=this.label?!0:!!e,r=this.helpText?!0:!!t;return w`
      <div
        part="form-control"
        class=${F({"form-control":!0,"form-control--small":this.size===`small`,"form-control--medium":this.size===`medium`,"form-control--large":this.size===`large`,"form-control--has-label":n,"form-control--has-help-text":r})}
      >
        <label
          part="form-control-label"
          class="form-control__label"
          for="input"
          aria-hidden=${n?`false`:`true`}
        >
          <slot name="label">${this.label}</slot>
        </label>

        <div part="form-control-input" class="form-control-input">
          <div
            part="base"
            class=${F({textarea:!0,"textarea--small":this.size===`small`,"textarea--medium":this.size===`medium`,"textarea--large":this.size===`large`,"textarea--standard":!this.filled,"textarea--filled":this.filled,"textarea--disabled":this.disabled,"textarea--focused":this.hasFocus,"textarea--empty":!this.value,"textarea--resize-none":this.resize===`none`,"textarea--resize-vertical":this.resize===`vertical`,"textarea--resize-auto":this.resize===`auto`})}
          >
            <textarea
              part="textarea"
              id="input"
              class="textarea__control"
              title=${this.title}
              name=${I(this.name)}
              .value=${Jn(this.value)}
              ?disabled=${this.disabled}
              ?readonly=${this.readonly}
              ?required=${this.required}
              placeholder=${I(this.placeholder)}
              rows=${I(this.rows)}
              minlength=${I(this.minlength)}
              maxlength=${I(this.maxlength)}
              autocapitalize=${I(this.autocapitalize)}
              autocorrect=${I(this.autocorrect)}
              ?autofocus=${this.autofocus}
              spellcheck=${I(this.spellcheck)}
              enterkeyhint=${I(this.enterkeyhint)}
              inputmode=${I(this.inputmode)}
              aria-describedby="help-text"
              @change=${this.handleChange}
              @input=${this.handleInput}
              @invalid=${this.handleInvalid}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
            ></textarea>
            <!-- This "adjuster" exists to prevent layout shifting. https://github.com/shoelace-style/shoelace/issues/2180 -->
            <div part="textarea-adjuster" class="textarea__size-adjuster" ?hidden=${this.resize!==`auto`}></div>
          </div>
        </div>

        <div
          part="form-control-help-text"
          id="help-text"
          class="form-control__help-text"
          aria-hidden=${r?`false`:`true`}
        >
          <slot name="help-text">${this.helpText}</slot>
        </div>
      </div>
    `}};K.styles=[k,qn,Zi],D([M(`.textarea__control`)],K.prototype,`input`,2),D([M(`.textarea__size-adjuster`)],K.prototype,`sizeAdjuster`,2),D([j()],K.prototype,`hasFocus`,2),D([A()],K.prototype,`title`,2),D([A()],K.prototype,`name`,2),D([A()],K.prototype,`value`,2),D([A({reflect:!0})],K.prototype,`size`,2),D([A({type:Boolean,reflect:!0})],K.prototype,`filled`,2),D([A()],K.prototype,`label`,2),D([A({attribute:`help-text`})],K.prototype,`helpText`,2),D([A()],K.prototype,`placeholder`,2),D([A({type:Number})],K.prototype,`rows`,2),D([A()],K.prototype,`resize`,2),D([A({type:Boolean,reflect:!0})],K.prototype,`disabled`,2),D([A({type:Boolean,reflect:!0})],K.prototype,`readonly`,2),D([A({reflect:!0})],K.prototype,`form`,2),D([A({type:Boolean,reflect:!0})],K.prototype,`required`,2),D([A({type:Number})],K.prototype,`minlength`,2),D([A({type:Number})],K.prototype,`maxlength`,2),D([A()],K.prototype,`autocapitalize`,2),D([A()],K.prototype,`autocorrect`,2),D([A()],K.prototype,`autocomplete`,2),D([A({type:Boolean})],K.prototype,`autofocus`,2),D([A()],K.prototype,`enterkeyhint`,2),D([A({type:Boolean,converter:{fromAttribute:e=>!(!e||e===`false`),toAttribute:e=>e?`true`:`false`}})],K.prototype,`spellcheck`,2),D([A()],K.prototype,`inputmode`,2),D([Kn()],K.prototype,`defaultValue`,2),D([O(`disabled`,{waitUntilFirstUpdate:!0})],K.prototype,`handleDisabledChange`,1),D([O(`rows`,{waitUntilFirstUpdate:!0})],K.prototype,`handleRowsChange`,1),D([O(`value`,{waitUntilFirstUpdate:!0})],K.prototype,`handleValueChange`,1),K.define(`sl-textarea`);var Qi=600*1e3,$i=new URLSearchParams(location.search).get(`token`)||``;$i&&Fa();var ea=`cx_remote_notify_sessions`,ta=[`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">`,`<path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>`,`<path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>`,`</svg>`].join(``),na=`data:image/svg+xml,${encodeURIComponent(ta)}`,ra=localStorage.getItem(`cx_remote_client_id`);ra||(ra=crypto.randomUUID(),localStorage.setItem(`cx_remote_client_id`,ra));var ia=`Web ${ra.slice(0,8)}`,aa={"Content-Type":`application/json`},oa=Ra(window.__CX_REMOTE_BASE_PATH__||``),q={auth:Z(`/api/auth`),status:Z(`/api/status`),workspaces:Z(`/api/workspaces`),sessions:Z(`/api/sessions`),sessionsForCwd:(e,t)=>Z(`/api/sessions?nodeId=${encodeURIComponent(e)}&cwd=${encodeURIComponent(t)}`),adoptSession:Z(`/api/sessions/adopt`),codexSessions:(e,t)=>Z(`/api/codex/sessions?nodeId=${encodeURIComponent(e)}&cwd=${encodeURIComponent(t)}&limit=3`),codexSessionPreview:(e,t)=>Z(`/api/codex/sessions/${encodeURIComponent(t)}/preview?nodeId=${encodeURIComponent(e)}`),files:(e,t)=>Z(`/api/files?workspaceId=${encodeURIComponent(e)}&path=${encodeURIComponent(t)}`),session:(e,t=``)=>Z(`/api/sessions/${encodeURIComponent(e)}${t}`),approvals:e=>Z(`/api/approvals?sessionId=${encodeURIComponent(e)}&status=all&limit=50`),approvalResolve:e=>Z(`/api/approvals/${encodeURIComponent(e)}/resolve`),events:(e,t)=>{let n=new URLSearchParams;e&&n.set(`sessionId`,e),t&&n.set(`afterId`,String(t));let r=n.toString();return Z(r?`/api/events?${r}`:`/api/events`)}},J=localStorage.getItem(`cx_remote_session`)||``,sa=localStorage.getItem(`cx_remote_workspace`)||``,ca=[],la=[],ua=[],da=[],fa=[],pa=[],ma=[],ha=[],Y=null,ga=null,_a={},va=``,ya=``,ba=new Map,xa=``,Sa=null,Ca=``,wa=null,Ta=0,Ea=``,Da=null,Oa=null,ka=!1,Aa=0,ja=new Map,Ma=new WeakSet;function X(e){let t=document.getElementById(e);if(!t)throw Error(`Missing element: ${e}`);return t}X(`refresh-icon`).setAttribute(`src`,na),X(`refresh-path-sessions-icon`).setAttribute(`src`,na);async function Na(){if((await fetch(q.status,{credentials:`same-origin`})).ok)return;let e=$i||prompt(`Access token`)||``,t=await fetch(q.auth,{method:`POST`,credentials:`same-origin`,headers:{Authorization:`Bearer ${e}`}});if(!t.ok)throw Error(await Pa(t))}async function Pa(e){let t=await e.text();try{return JSON.parse(t).error?.message||t||e.statusText}catch{return t||e.statusText}}function Fa(){let e=new URL(location.href);e.searchParams.delete(`token`),history.replaceState(null,``,e.pathname+e.search+e.hash)}function Ia(e,t){let n=ba.get(t||Ka()?.nodeId||`local`)||ya;return n&&(e===n||e.startsWith(`${n}/`))?`~${e.slice(n.length)}`:e}function La(e,t){return e.length>t?`${e.slice(0,t-1)}...`:e}function Z(e){return`${oa}${e}`}function Ra(e){let t=e.replace(/\/+$/,``);return t===`/`?``:t}async function Q(e,t={}){let n=await fetch(e,{...t,credentials:`same-origin`,headers:{...aa,...t.headers||{}}}),r=await n.text();if(!n.ok)try{let e=JSON.parse(r);throw Error(e.error?.message||r)}catch(e){throw e instanceof SyntaxError?Error(r||n.statusText):e}return n.headers.get(`content-type`)?.includes(`application/json`)&&r?JSON.parse(r):r}async function za(){let e=await Q(q.status);ya=e.homePath,ba.clear(),e.nodes.forEach(e=>{e.homePath&&ba.set(e.id,e.homePath)}),_a=e.codexDefaults||{},Jo(e.codexRuntimeDefaults),qo(`new`,_a),To(e.eventCursor),X(`status`).textContent=`${e.stats.sessions} managed sessions · ${e.stats.pendingApprovals} approvals · ${e.stats.queuedPrompts} queued`,ca=await Q(q.sessions),J&&!ca.some(e=>e.id===J)&&(J=``),!J&&ca[0]&&(J=ca[0].id),Xa(),await Ba(),Za(),await qa(),ko()}async function Ba(){ha=await Q(q.workspaces),ha.length&&(ha.some(e=>e.id===sa)||(sa=ha[0].id),localStorage.setItem(`cx_remote_workspace`,sa),Va(),await Ha(va))}function Va(){let e=X(`workspace-root`);e.innerHTML=``;for(let t of ha){let n=document.createElement(`sl-option`);n.setAttribute(`value`,t.id),n.textContent=`${t.nodeName} · ${t.name} · ${Ia(t.path,t.nodeId)}`,e.appendChild(n)}if(ha.length===1){e.hidden=!0;return}e.hidden=!1,e.value=sa}async function Ha(e){let t=Ka();if(!t)return;let n=await Q(q.files(t.id,e));sa=n.workspaceId,localStorage.setItem(`cx_remote_workspace`,sa),va=n.relativePath||``,X(`cwd`).value=n.current,Ua(n),await Wa(n.current,n.nodeId)}function Ua(e){let t=X(`dirs`);t.innerHTML=``,e.relativePath&&t.appendChild(Ao(`..`,{size:`small`,className:`dir-button`,onClick:()=>Ha(e.parentPath)}));for(let n of e.entries)t.appendChild(Ao(n.name,{size:`small`,className:`dir-button`,onClick:()=>Ha(n.relativePath)}));t.childElementCount||t.appendChild(Mo(`No child directories`))}async function Wa(e=X(`cwd`).value.trim(),t=Ka()?.nodeId){if(!e||!t){la=[],ua=[],Za();return}let n=++Aa;ka=!0,Za();try{let[r,i]=await Promise.all([Q(q.sessionsForCwd(t,e)),Q(q.codexSessions(t,e))]);if(n!==Aa||X(`cwd`).value.trim()!==i.cwd||Ka()?.nodeId!==t)return;la=r,ua=i.sessions}finally{n===Aa&&(ka=!1,Za())}}function Ga(e){let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleString()}function Ka(){return ha.find(e=>e.id===sa)}async function qa(){if(!J){Eo(),Y=null,ga=null,da=[],fa=[],pa=[],ma=[],xa=``,so();return}let e=J;Y?.id!==e&&(xa=``);let t=await Q(q.session(e));e===J&&(Y=t.session,ga=t.nativeCodexActivity||null,Ja(t.session),da=t.messages,fa=t.approvals,ma=t.queue||[],wo(e,t.eventCursor),pa=await Q(q.approvals(e)),e===J&&(so(),Oo(e)))}function Ja(e){ca=Ya(ca,e,!0);let t=Ka();la=Ya(la,e,!!(t&&e.nodeId===t.nodeId&&e.cwd===X(`cwd`).value.trim())),Xa(),Za()}function Ya(e,t,n){let r=e.filter(e=>e.id!==t.id);return n?[t,...r].sort((e,t)=>t.updatedAt-e.updatedAt):r}function Xa(){let e=X(`recent-sessions`);if(e.innerHTML=``,!ca.length){e.appendChild(Mo(`No Hub sessions`));return}for(let t of ca)e.appendChild(Qa(t,!0))}function Za(){let e=X(`path-sessions`);if(e.innerHTML=``,ka){e.appendChild(Mo(`Loading sessions`));return}let t=ua.filter(e=>!e.managedSessionId);if(!la.length&&!t.length){e.appendChild(Mo(`No sessions in this directory`));return}if(la.length){e.appendChild(eo(`Hub-managed`));for(let t of la)e.appendChild(Qa(t,!1))}if(t.length){e.appendChild(eo(`Codex resume`));for(let n of t)e.appendChild($a(n))}}function Qa(e,t){let n=Ao(``,{className:`session${e.id===J?` active`:``}`,size:`small`,onClick:()=>to(e)}),r=document.createElement(`span`);r.className=`session-line`;let i=document.createElement(`span`);i.className=`session-name`,i.textContent=e.title,r.append(i,jo(e.status));let a=document.createElement(`span`);return a.className=`session-path muted`,a.textContent=t?[e.nodeName,Ia(e.cwd,e.nodeId)].filter(Boolean).join(` · `):[`Updated ${Ga(e.updatedAt)}`,uo(e.localId)].filter(Boolean).join(` · `),n.append(r,a),n}function $a(e){let t=Ao(``,{className:`session codex-session`,size:`small`,onClick:()=>no(e)}),n=document.createElement(`span`);n.className=`session-line`;let r=document.createElement(`span`);r.className=`session-name`,r.textContent=e.title;let i=document.createElement(`span`);i.className=`session-action`,i.textContent=`Adopt`,n.append(r,i);let a=document.createElement(`span`);return a.className=`session-path muted`,a.textContent=[e.nodeName,`Updated ${Ga(e.updatedAt)}`,uo(e.localId),e.originator||``].filter(Boolean).join(` · `),t.append(n,a),t}function eo(e){let t=document.createElement(`div`);return t.className=`section-label muted`,t.textContent=e,t}async function to(e){J=e.id,localStorage.setItem(`cx_remote_session`,J),await fo(e),Xa(),Za(),await qa(),es()}async function no(e){let t=await Q(q.codexSessionPreview(e.nodeId,e.localId));if(t.managedSessionId)throw Error(`Codex thread is already managed by Hub session: ${t.managedSessionId}`);Da=e,Oa=t,ro(t),await X(`adopt-dialog`).show()}function ro(e){X(`adopt-title`).textContent=e.title,X(`adopt-meta`).textContent=[e.nodeName,Ia(e.cwd,e.nodeId),`Updated ${Ga(e.updatedAt)}`,uo(e.localId),`${e.messageCount} messages`].filter(Boolean).join(` · `);let t=X(`adopt-preview-messages`);if(t.innerHTML=``,!e.messages.length){t.appendChild(Mo(`No transcript messages`));return}for(let n of e.messages)t.appendChild(io(n))}function io(e){let t=document.createElement(`div`);t.className=`preview-msg ${e.role}`;let n=document.createElement(`div`);n.className=`preview-msg-meta`,n.textContent=`${e.role} · ${Ga(e.createdAt)}`;let r=document.createElement(`div`);return r.className=`preview-msg-content`,r.textContent=e.content,t.append(n,r),t}function ao(){Da=null,Oa=null,X(`adopt-preview-messages`).innerHTML=``}async function oo(){!Da||!Oa||(J=(await Q(q.adoptSession,{method:`POST`,body:JSON.stringify({nodeId:Da.nodeId,threadId:Da.localId,cwd:Oa.cwd,title:Oa.title,importTranscript:!0,config:Xo(`new`)})})).id,localStorage.setItem(`cx_remote_session`,J),await X(`adopt-dialog`).hide(),ao(),await za(),es())}function so(){Y?co():(X(`session-title`).textContent=`No Hub session`,X(`session-meta`).textContent=`Create a managed session or adopt an existing Codex thread.`,X(`session-detail`).innerHTML=``),mo(),xo(),bo(),po()}function co(){if(!Y)return;let e=Y.config||{},t=ga;X(`session-title`).textContent=Y.title,X(`session-meta`).textContent=`${Y.nodeName} · ${Ia(Y.cwd,Y.nodeId)}`;let n=X(`session-detail`);n.innerHTML=``;let r=document.createElement(`div`);r.className=`meta-row`,[[`node`,Y.nodeName],[`status`,Y.status],[`control`,Y.controlLabel||`shared`],[`model`,e.model||`-`],[`permission`,e.permissionMode||`-`],[`search`,e.search?`on`:`off`]].forEach(([e,t])=>r.appendChild(lo(e,t))),n.appendChild(r);let i=[[`Hub session`,uo(Y.localId)],[`Codex thread`,uo(Y.codexThreadId)],[`Codex turn`,uo(Y.currentTurnId)],t?[`native Codex`,`${t.state} · ${uo(t.threadId)}${t.lastEventName?` · ${t.lastEventName}`:``}`]:null,[`lease`,Y.controlLeaseExpiresAt?new Date(Y.controlLeaseExpiresAt).toLocaleTimeString():``],[`error`,Y.lastError||``]].filter(e=>!!(e&&e[1]));if(i.length){let e=document.createElement(`div`);e.className=`runtime-line`,e.textContent=i.map(([e,t])=>`${e} ${t}`).join(` · `),n.appendChild(e)}}function lo(e,t){let n=document.createElement(`span`);n.className=`meta-chip`;let r=document.createElement(`strong`);return r.textContent=`${e} `,n.append(r,String(t)),n}function uo(e){return e?e.slice(0,8):``}async function fo(e){let t=ha.filter(t=>t.nodeId===e.nodeId).filter(t=>e.cwd===t.path||e.cwd.startsWith(`${t.path}/`)).sort((e,t)=>t.path.length-e.path.length)[0];t&&(sa!==t.id&&(sa=t.id,localStorage.setItem(`cx_remote_workspace`,sa)),await Ha(e.cwd===t.path?``:e.cwd.slice(t.path.length+1)))}function po(){let e=!!Y,t=Y?.controlOwnerId===ra,n=!!(Y?.controlOwnerId&&!t),r=Y?.status===`running`||Y?.status===`waiting_approval`||ma.length>0;X(`rename`).disabled=!e,X(`runtime`).disabled=!e||r,X(`delete`).disabled=!e;let i=X(`notify`);i.hidden=!e,i.disabled=!e,i.checked=!!(Y&&Po(Y.id));let a=X(`claim`);a.hidden=!e||t,a.disabled=!e||n,Vo(a,n?`Controlled by ${Y?.controlLabel||`another client`}`:`Take control`);let o=X(`release`);o.hidden=!e||!t,o.disabled=!t;let s=X(`stop`);s.hidden=!e||!r,s.disabled=!r}function mo(){let e=X(`messages`);e.innerHTML=``;for(let t of da)e.appendChild(ho(t));xa&&e.appendChild(go()),e.scrollTop=e.scrollHeight}function ho(e){let t=document.createElement(`div`);return t.className=`msg ${e.role}${e.kind===`error`?` error`:``}`,t.append(vo(e.role,!!e.metadata?.queued),yo(e.content)),t}function go(){let e=document.createElement(`div`);return e.id=`streaming-message`,e.className=`msg assistant streaming`,e.append(vo(`assistant`,!1),yo(xa)),e}function _o(e){xa+=e;let t=document.getElementById(`streaming-message`);if(!t)t=go(),X(`messages`).appendChild(t);else{let e=t.querySelector(`.msg-content`);e&&(e.textContent=xa)}let n=X(`messages`);n.scrollTop=n.scrollHeight}function vo(e,t){let n=document.createElement(`div`);n.className=`msg-meta`;let r=document.createElement(`sl-badge`);if(r.className=`role-badge role-main`,r.setAttribute(`variant`,e===`user`?`primary`:e===`assistant`?`success`:`neutral`),r.textContent=e,n.appendChild(r),t){let e=document.createElement(`sl-badge`);e.className=`role-badge queued-badge`,e.setAttribute(`variant`,`neutral`),e.textContent=`queued`,n.appendChild(e)}return n}function yo(e){let t=document.createElement(`div`);return t.className=`msg-content`,t.textContent=e,t}function bo(){let e=pa.filter(e=>e.status!==`pending`),t=X(`approvals`);t.hidden=fa.length===0&&e.length===0,So(X(`pending-approvals`),fa,!0);let n=X(`approval-history-details`);n.hidden=e.length===0,So(X(`approval-history`),e,!1)}function xo(){let e=X(`prompt-queue`);if(e.innerHTML=``,e.hidden=ma.length===0,!ma.length)return;let t=document.createElement(`div`);t.className=`muted`,t.textContent=`Prompt queue`,e.appendChild(t),ma.forEach((t,n)=>{let r=document.createElement(`div`);r.className=`queue-job ${t.status}`;let i=document.createElement(`div`);i.textContent=`#${n+1} · ${t.status} · ${t.source} · ${new Date(t.createdAt).toLocaleString()}`;let a=document.createElement(`pre`);a.textContent=t.text,r.append(i,a),e.appendChild(r)})}function So(e,t,n){if(e.innerHTML=``,e.hidden=t.length===0,!t.length)return;let r=document.createElement(`div`);r.className=`muted`,r.textContent=n?`Pending approvals`:`Approval history`,e.appendChild(r);for(let r of t){let t=document.createElement(`div`);t.className=`approval${n?``:` resolved`}`;let i=document.createElement(`div`);i.textContent=`${r.toolName} · ${r.status}${r.decision?` · ${r.decision}`:``}`;let a=document.createElement(`pre`);if(a.textContent=JSON.stringify(r.input,null,2),t.append(i,a),n){let e=document.createElement(`div`);e.className=`row`,e.append(Ao(r.type===`choice`?`Choose 1`:`Allow`,{variant:`primary`,onClick:()=>Co(r.id,r.type===`choice`?`0`:`approved`)}),Ao(r.type===`choice`?`Cancel`:`Deny`,{variant:`danger`,onClick:()=>Co(r.id,r.type===`choice`?`cancel`:`denied`)})),t.appendChild(e)}e.appendChild(t)}}async function Co(e,t){await Q(q.approvalResolve(e),{method:`POST`,body:JSON.stringify({decision:t,controlType:`web`})}),await qa()}function wo(e,t){let n=Number(t);!Number.isFinite(n)||n<=0||n>(ja.get(e)||0)&&ja.set(e,n)}function To(e){let t=Number(e);Number.isFinite(t)&&t>Ta&&(Ta=t)}function Eo(){Sa&&Sa.close(),Sa=null,Ca=``}function Do(){wa&&wa.close(),wa=null}function Oo(e){if(Sa&&Ca===e)return;Eo(),Ca=e;let t=q.events(e,ja.get(e));Sa=new EventSource(t,{withCredentials:!0}),Sa.onmessage=t=>{let n=JSON.parse(t.data);if(wo(e,t.lastEventId||n.id),e===J&&n.type!==`ready`){if(n.type===`message.delta`){_o(String(n.payload?.delta||``));return}if(n.type===`session.deleted`){J=``,localStorage.removeItem(`cx_remote_session`),Eo(),Wo(za());return}if(n.type===`message.created`){let e=n.payload?.message;if(e?.id&&!da.some(t=>t.id===e.id)){da.push(e),e.role===`assistant`&&(xa=``),mo();return}}([`approval.created`,`approval.resolved`,`session.control.updated`,`codex.native.activity.updated`].includes(n.type)||n.type===`session.updated`&&n.payload?.queuedPrompts!==void 0)&&Wo(qa())}},Sa.onerror=()=>Uo(Error(`Event stream disconnected`))}function ko(){if(!ca.some(e=>Po(e.id))||!(`Notification`in window)||Notification.permission!==`granted`){Do();return}wa||(wa=new EventSource(q.events(void 0,Ta),{withCredentials:!0}),wa.onmessage=e=>{let t=JSON.parse(e.data);if(To(e.lastEventId||t.id),t.type!==`message.created`)return;let n=t.payload?.message;n?.id&&Ro(n)},wa.onerror=()=>Uo(Error(`Notification event stream disconnected`)))}function Ao(e,t){let n=document.createElement(`sl-button`);if(n.setAttribute(`type`,`button`),t.className&&(n.className=t.className),t.size&&n.setAttribute(`size`,t.size),t.variant&&n.setAttribute(`variant`,t.variant),t.icon){let e=document.createElement(`sl-icon`);e.setAttribute(`slot`,`prefix`),e.setAttribute(`library`,`system`),e.setAttribute(`name`,t.icon),n.appendChild(e)}return e&&n.append(e),n.addEventListener(`click`,()=>$(n,t.onClick)),n}function jo(e){let t=document.createElement(`sl-badge`);return t.setAttribute(`variant`,e===`idle`?`neutral`:`primary`),t.textContent=e,t}function Mo(e){let t=document.createElement(`div`);return t.className=`muted`,t.textContent=e,t}function No(){try{let e=JSON.parse(localStorage.getItem(ea)||`{}`);return e&&typeof e==`object`&&!Array.isArray(e)?e:{}}catch{return{}}}function Po(e){return No()[e]===!0}function Fo(e,t){let n=No();t?n[e]=!0:delete n[e],localStorage.setItem(ea,JSON.stringify(n))}async function Io(){if(!(`Notification`in window))throw Error(`Browser notifications are unavailable`);if(Notification.permission!==`granted`){if(Notification.permission===`denied`)throw Error(`Browser notifications are blocked`);if(await Notification.requestPermission()!==`granted`)throw Error(`Browser notification permission was not granted`)}}async function Lo(e){let t=Y?.id;if(t)try{e&&(await Io(),await zo()),Fo(t,e)}finally{po(),ko()}}function Ro(e){e.role!==`assistant`||!e.content.trim()||Po(e.sessionId)&&(!(`Notification`in window)||Notification.permission!==`granted`||new Notification(Bo(e.sessionId),{body:La(e.content.trim(),180),tag:`cx-remote-${e.sessionId}`}))}async function zo(){let e=await Q(q.status);ya=e.homePath,e.nodes.forEach(e=>{e.homePath&&ba.set(e.id,e.homePath)}),To(e.eventCursor)}function Bo(e){let t=ca.find(t=>t.id===e)||Y;return t?`${t.nodeName} · ${t.title}`:`CX Remote`}function Vo(e,t){let n=e.querySelector(`sl-icon`);e.textContent=``,n&&e.appendChild(n),e.append(t)}function Ho(e){Ea=e.id,X(`delete-dialog-message`).textContent=`Delete Hub session ${e.title}?`,Wo(X(`delete-dialog`).show())}function Uo(e){let t=e instanceof Error?e.message:String(e);X(`error-message`).textContent=t,Wo(X(`error-alert`).show())}function Wo(e){e.catch(Uo)}function $(e,t){Ma.has(e)||(Ma.add(e),Go(e,!0),Promise.resolve().then(t).catch(Uo).finally(()=>{Ma.delete(e),Go(e,!1),po()}))}function Go(e,t){e.toggleAttribute(`aria-busy`,t),`disabled`in e&&(e.disabled=t)}function Ko(e){return e.querySelector(`sl-button[type="submit"]`)||e}function qo(e,t){X(`${e}-search`).checked=t.search===!0,X(`${e}-permission-mode`).value=t.permissionMode||`default`;let n=document.getElementById(`${e}-model`),r=document.getElementById(`${e}-reasoning-effort`);n&&(n.value=t.model||`auto`),r&&(r.value=t.reasoningEffort||`default`)}function Jo(e){[`new`,`runtime`].forEach(t=>{Yo(`${t}-model`,`auto`,`Default(${e.model})`),Yo(`${t}-reasoning-effort`,`default`,`Default(${e.reasoningEffort})`)})}function Yo(e,t,n){let r=document.querySelector(`#${e} sl-option[value="${t}"]`);r&&(r.textContent=n)}function Xo(e){let t={search:X(`${e}-search`).checked,permissionMode:X(`${e}-permission-mode`).value},n=document.getElementById(`${e}-model`),r=document.getElementById(`${e}-reasoning-effort`);return n&&(t.model=n.value),r&&(t.reasoningEffort=r.value),t}function Zo(e){qo(`runtime`,e.config||{}),Wo(X(`runtime-dialog`).show())}async function Qo(){Y&&(await Q(q.session(Y.id,`/config`),{method:`PATCH`,body:JSON.stringify({config:Xo(`runtime`)})}),await X(`runtime-dialog`).hide(),await za())}function $o(e){document.body.classList.toggle(`sidebar-open`,e)}function es(){window.matchMedia(`(max-width: 760px)`).matches&&$o(!1)}X(`workspace-root`).addEventListener(`sl-change`,e=>{sa=e.currentTarget.value,va=``,localStorage.setItem(`cx_remote_workspace`,sa),Wo(Ha(``))}),X(`root-dir`).addEventListener(`click`,e=>$(e.currentTarget,()=>Ha(``))),X(`refresh`).addEventListener(`click`,e=>$(e.currentTarget,za)),X(`refresh-path-sessions`).addEventListener(`click`,e=>$(e.currentTarget,()=>Wa())),X(`sidebar-toggle`).addEventListener(`click`,()=>$o(!0)),X(`sidebar-close`).addEventListener(`click`,()=>$o(!1)),X(`sidebar-backdrop`).addEventListener(`click`,()=>$o(!1)),X(`claim`).addEventListener(`click`,e=>$(e.currentTarget,async()=>{Y&&(await Q(q.session(Y.id,`/control`),{method:`PATCH`,body:JSON.stringify({controlType:`web`,ownerId:ra,controlLabel:ia,ttlMs:Qi})}),await qa())})),X(`release`).addEventListener(`click`,e=>$(e.currentTarget,async()=>{Y&&(await Q(q.session(Y.id,`/control?ownerId=${encodeURIComponent(ra)}`),{method:`DELETE`}),await qa())})),X(`stop`).addEventListener(`click`,e=>{$(e.currentTarget,async()=>{J&&await Q(q.session(J,`/interrupt`),{method:`POST`}).then(za)})}),X(`rename`).addEventListener(`click`,e=>$(e.currentTarget,async()=>{if(!Y)return;let e=prompt(`Title`,Y.title);e&&(await Q(q.session(Y.id),{method:`PATCH`,body:JSON.stringify({title:e})}),await za())})),X(`runtime`).addEventListener(`click`,e=>$(e.currentTarget,()=>{Y&&Zo(Y)})),X(`delete`).addEventListener(`click`,e=>$(e.currentTarget,()=>{Y&&Ho(Y)})),X(`notify`).addEventListener(`sl-change`,e=>$(e.currentTarget,async()=>{await Lo(e.currentTarget.checked)})),X(`delete-cancel`).addEventListener(`click`,e=>$(e.currentTarget,()=>X(`delete-dialog`).hide())),X(`adopt-cancel`).addEventListener(`click`,e=>$(e.currentTarget,async()=>{await X(`adopt-dialog`).hide(),ao()})),X(`adopt-confirm`).addEventListener(`click`,e=>$(e.currentTarget,oo)),X(`adopt-dialog`).addEventListener(`sl-hide`,()=>ao()),X(`runtime-cancel`).addEventListener(`click`,e=>$(e.currentTarget,()=>X(`runtime-dialog`).hide())),X(`runtime-save`).addEventListener(`click`,e=>$(e.currentTarget,Qo)),X(`delete-confirm`).addEventListener(`click`,e=>$(e.currentTarget,async()=>{Ea&&(await Q(q.session(Ea),{method:`DELETE`}),await X(`delete-dialog`).hide(),J=``,Ea=``,localStorage.removeItem(`cx_remote_session`),await za())})),X(`new-session`).addEventListener(`submit`,e=>{e.preventDefault();let t=e.currentTarget;$(Ko(t),async()=>{let e=Ka();if(!e)throw Error(`Select a workspace`);let n=X(`cwd`).value.trim(),r=X(`new-title`).value.trim();J=(await Q(q.sessions,{method:`POST`,body:JSON.stringify({nodeId:e.nodeId,cwd:n,title:r,config:Xo(`new`)})})).id,localStorage.setItem(`cx_remote_session`,J),t.reset(),await za(),es()})}),X(`composer`).addEventListener(`submit`,e=>{e.preventDefault();let t=e.currentTarget;$(Ko(t),async()=>{if(!J)throw Error(`Select a session`);let e=X(`composer-text`).value;X(`send-state`).textContent=`Sending`;try{await Q(q.session(J,`/messages`),{method:`POST`,body:JSON.stringify({text:e,ownerId:ra,controlLabel:ia})}),t.reset(),await qa()}finally{X(`send-state`).textContent=``}})}),Wo((async()=>{await Na(),await za()})());