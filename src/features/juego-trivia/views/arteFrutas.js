  export function fruitGlyphMarkup(name, x, y, scale, className, withTitle){
    // Formas compartidas por el selector, los ingredientes y los adornos del vaso.
    // Sin IDs ni definiciones globales: cada fruta puede repetirse en el mismo SVG.
    const citrus = name === 'Limón' || name === 'Naranja';
    const rind = name === 'Limón' ? '#879a36' : '#da7624';
    const pulp = name === 'Limón' ? '#e5cf45' : '#f5a331';
    let shape = '';
    if (citrus){
      const segments = Array.from({length:8}, function(_, i){
        return '<path d="M.7-1.5L.8-7.1A7.2 7.2 0 0 1 4.5-5.6Z" transform="rotate(' + i * 45 + ')" fill="' + pulp + '"/>';
      }).join('');
      shape = '<path d="M2-8C4-13 9-12 11-11C9-7 5-7 2-8Z" fill="#607d3d"/><circle r="10" fill="' + rind + '"/><circle r="8.6" fill="#fff2c8"/>' + segments + '<circle r="1.1" fill="#fff8de"/><path d="M-7-4A8 8 0 0 1-3-7" fill="none" stroke="#fff8de" stroke-width=".8" stroke-linecap="round"/>';
    } else if (name === 'Piña'){
      shape = '<path d="M-1-4Q-9-6-9-12Q-3-11-1-6Q-5-13-2-15Q2-12 2-6Q5-13 9-12Q9-7 4-4Z" fill="#476f39"/><path d="M0-4Q-3-10 1-14Q4-9 2-4" fill="#839a48"/><path d="M0-5C-6-5-8-1-8 4S-5 12 0 12S8 9 8 4S6-5 0-5Z" fill="#edba3c"/><path d="M-5-3L7 7M-8 1L3 11M1-5L8 1M5-3L-7 7M8 1L-3 11M-1-5L-8 1" fill="none" stroke="#bc852c" stroke-width=".65"/><path d="M-5 0Q-7 5-4 8" fill="none" stroke="#ffdb70" stroke-width="1.4" stroke-linecap="round"/>';
    } else if (name === 'Mango'){
      shape = '<path d="M2-8Q1-12 4-13" fill="none" stroke="#76532c" stroke-width="1.3" stroke-linecap="round"/><path d="M3-10Q7-14 12-10Q8-6 3-10Z" fill="#678844"/><path d="M1-9C7-11 11-7 10-1C9 6 2 12-4 11C-11 10-10 3-7-1C-4-5-4-8 1-9Z" fill="#eea334"/><path d="M7-7C12-2 6 10-3 11C1 8 4 5 5 1C7-3 7-5 7-7Z" fill="#dc7629"/><path d="M-5 0Q-2-6 2-6" fill="none" stroke="#ffda78" stroke-width="1.7" stroke-linecap="round"/>';
    } else if (name === 'Maracuyá'){
      shape = '<ellipse cx="-3" cy="-2" rx="8" ry="9" fill="#825060"/><path d="M-9-4Q-8-8-5-8" fill="none" stroke="#b37b80" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="3" cy="3" rx="8" ry="8.5" fill="#955969"/><ellipse cx="3" cy="3" rx="6.9" ry="7.3" fill="#fff0c7"/><ellipse cx="3" cy="3" rx="5.8" ry="6.2" fill="#efbd3e"/>' + [[1,-1],[5,-1],[-1,3],[3,3],[7,3],[1,7],[5,7]].map(function(p){return '<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx=".8" ry="1.15" transform="rotate(25 '+p[0]+' '+p[1]+')" fill="#514530"/>';}).join('');
    } else if (name === 'Coco'){
      shape = '<path d="M-11-2C-10 8-5 12 1 11C7 11 11 5 11-2Z" fill="#795035"/><path d="M-8 3L-5 7M-3 6L-1 9M5 5L3 8M9 1L7 4" stroke="#a57a4b" stroke-width=".8" stroke-linecap="round"/><ellipse cy="-2" rx="11" ry="6.5" fill="#5d3c2a"/><ellipse cy="-2" rx="9.3" ry="5.1" fill="#fff6de"/><ellipse cy="-1.6" rx="6.7" ry="3.1" fill="#e3d7b0"/><path d="M-6-3Q0-6 6-3" fill="none" stroke="#fffdf0" stroke-width="1.2" stroke-linecap="round"/>';
    } else if (name === 'Fresa'){
      shape = '<path d="M0-7C5-12 12-6 9 0C7 5 3 10 0 12C-3 10-7 5-9 0C-12-6-5-12 0-7Z" fill="#c64b49"/><path d="M7-6Q12 1 0 12Q4 5 5 0Z" fill="#a93639"/><path d="M-6-3Q-7-6-4-6" fill="none" stroke="#ed8580" stroke-width="1.4" stroke-linecap="round"/><path d="M0-6L-7-8L-3-9L-4-12L0-10L4-12L3-8L7-7L2-5Z" fill="#54783d"/><path d="M0-9Q-1-12 1-14" fill="none" stroke="#54783d" stroke-width="1.2" stroke-linecap="round"/>' + [[-5,-1],[0,-2],[5,-1],[-3,3],[2,3],[0,7]].map(function(p){return '<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx=".55" ry="1" fill="#ffe0a0"/>';}).join('');
    } else if (name === 'Sandía'){
      shape = '<path d="M-12-6H12Q10 11 0 12Q-10 11-12-6Z" fill="#4b7940"/><path d="M-10.5-5H10.5Q8.5 9 0 10Q-8.5 9-10.5-5Z" fill="#c9d77c"/><path d="M-9-4H9Q7 7.5 0 8.5Q-7 7.5-9-4Z" fill="#df6665"/><path d="M-7-3H7" stroke="#f18b7c" stroke-width="1" stroke-linecap="round"/>' + [[-5,0],[0,-1],[5,0],[-2.5,4],[2.5,4]].map(function(p){return '<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx=".65" ry="1.1" fill="#5c3c34"/>';}).join('');
    } else if (name === 'Durazno'){
      shape = '<path d="M0-7C-8-12-13-4-10 3C-8 9-3 12 0 10C4 12 10 7 11 1C13-6 6-11 0-7Z" fill="#eda165"/><path d="M6-7C13-5 12 3 8 7Q3 12 0 10C5 7 7 1 6-7Z" fill="#dc7b5b"/><path d="M0-6Q4 1 0 8" fill="none" stroke="#ce7751" stroke-width=".85" stroke-linecap="round"/><path d="M-7-2Q-7-6-4-6" fill="none" stroke="#ffd0a0" stroke-width="1.5" stroke-linecap="round"/><path d="M0-7Q-1-10 1-12" fill="none" stroke="#765333" stroke-width="1.2"/><path d="M1-10Q6-16 11-10Q6-6 1-10Z" fill="#678442"/><path d="M3-10H8" stroke="#9caf60" stroke-width=".65"/>';
    } else if (name === 'Menta'){
      shape = '<path d="M0 12Q2 2 4-7M1 6L-6-2" fill="none" stroke="#416c3b" stroke-width="1.4" stroke-linecap="round"/><path d="M1 5C-8 5-12-2-10-8C-3-9 2-3 1 5Z" fill="#6b974f"/><path d="M2 3C0-5 5-12 12-12C14-5 10 2 2 3Z" fill="#4e8043"/><path d="M0 3L-8-6M-2 1L-7 0M-4-2L-4-5M3 1L10-9M5-2L10-3M7-5L7-9" fill="none" stroke="#bed18a" stroke-width=".7" stroke-linecap="round"/>';
    }
    return '<g' + (className ? ' class="' + className + '"' : '') + ' transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' + (withTitle ? '<title>' + name + '</title>' : '') + shape + '</g>';
  }
