// Interact.js y los mismos umbrales y tiempos del gesto original.
export function bindFrutasGestures({root, interactOn, hit, resetFruitToken, hasFruit, addFruit, onToggle, setDragLock}){
  if (!interactOn() || window.matchMedia('(pointer: coarse)').matches) return;
  const glass = root.querySelector('.glass-build');
  root.querySelectorAll('.fruit').forEach(function(node){
    window.interact(node).draggable({
      listeners:{
        start: function(event){ event.target.dataset.moved = '0'; },
        move: function(event){
          const t = event.target;
          const x = (parseFloat(t.dataset.x) || 0) + event.dx;
          const y = (parseFloat(t.dataset.y) || 0) + event.dy;
          t.dataset.x = String(x);
          t.dataset.y = String(y);
          t.dataset.moved = String((parseFloat(t.dataset.moved) || 0) + Math.abs(event.dx) + Math.abs(event.dy));
          t.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        },
        end: function(event){
          const t = event.target;
          const moved = parseFloat(t.dataset.moved) || 0;
          const value = t.getAttribute('data-pick');
          if (moved > 10){
            setDragLock(Date.now() + 350);
            if (glass && hit(t, glass) && value && !hasFruit(value)) addFruit(value);
            else resetFruitToken(t);
            return;
          }
          setDragLock(Date.now() + 350);
          if (value) onToggle(value);
        }
      }
    });
  });
}
