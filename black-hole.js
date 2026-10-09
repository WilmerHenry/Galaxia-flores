import * as THREE from "three";

// Efecto visual del agujero negro. Su animación la controla galaxy.js.
export function createBlackHole() {
  const holeMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
    varying vec2 vUv; uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    void main(){
      vec2 p=(vUv-.5)*2.; p=mat2(.985,-.174,.174,.985)*p;
      float r=length(p), a=atan(p.y,p.x);
      float core=1.-smoothstep(.245,.255,r);
      float photon=exp(-abs(r-.263)*220.);
      float aura=exp(-abs(r-.28)*14.)*.52;
      float ellipse=length(vec2(p.x,p.y*4.5));
      float angle=atan(p.y*4.5,p.x);
      float diskMask=smoothstep(.28,.34,ellipse)*(1.-smoothstep(.7,.97,ellipse));
      float flow=noise(vec2(ellipse*34.,angle*6.-time*.24));
      float threads=pow(.5+.5*sin(ellipse*180.+flow*5.-time*.7),2.);
      float disk=diskMask*(.55+threads*.65)*(.7+.3*noise(p*35.+time*.04));
      disk*=p.y<0.?1.:1.-core;
      float lensR=length(vec2(p.x,p.y*1.18));
      float lens=exp(-abs(lensR-.30)*65.)*(.35+.65*abs(sin(a)));
      float energy=photon*1.7+aura+lens*.7;
      vec3 violet=vec3(.57,.18,1.);
      vec3 col=violet*energy+mix(violet,vec3(1.,.75,.94),threads)*disk*1.5;
      col+=vec3(1.,.88,1.)*photon;
      col*=1.-core;
      float alpha=max(core,clamp(energy+disk,0.,1.));
      gl_FragColor=vec4(col,alpha*(1.-smoothstep(.94,1.,r)));
    }`,
  });
  const blackHole = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 760),
    holeMaterial,
  );
  blackHole.renderOrder = 1;
  return blackHole;
}
