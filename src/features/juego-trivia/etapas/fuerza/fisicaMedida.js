// Resortes amortiguados compartidos por los tres utensilios.
export function crearCuerpo(){
  return {x:0,y:0,angle:0,vx:0,vy:0,va:0,targetX:0,targetY:0,targetAngle:0,wave:0};
}
export function avanzarCuerpo(body,dt,reduced=false){
  const step=Math.min(.032,Math.max(0,dt));
  if(reduced){body.x=body.targetX;body.y=body.targetY;body.angle=body.targetAngle;body.vx=body.vy=body.va=body.wave=0;return;}
  // Subpasos mantienen el mismo asentamiento en pantallas de 30, 60 y 120 Hz.
  for(let left=step;left>0;){
    const h=Math.min(left,1/120);left-=h;
    for(const [position,velocity,target] of [['x','vx','targetX'],['y','vy','targetY'],['angle','va','targetAngle']]){
      body[velocity]+=((body[target]-body[position])*230-body[velocity]*25)*h;
      body[position]+=body[velocity]*h;
    }
  }
  body.wave+=(Math.max(-8,Math.min(8,-body.vx*.025-body.va*.035))-body.wave)*Math.min(1,dt*9);
}
