var HALFPI = Math.PI * 0.5;
var PI2 = Math.PI * 2;
var PI  = Math.PI;

var canvas = null;
var ctx = null;

var fps = 0;
var frametime_delta = 1000/60;
var time_ms = 0; // start at 0
var time_s; // floating point
var time_sPI2; // double rad per s
var time_sPI; // one rad per s

var fps_counter_enabled = true;

var md_x, md_y, md_s;
var autoAlpha = 0;  

var tracks = [
  { name: "silicon slave - quantum shamanics", soundcloudId: 56115345 },
  { name: "hypnoxock - vibrations", soundcloudId: 66852712 },
  { name: "hypnoxock - viped1", soundcloudId: 63886334 },
  { name: "future crew - second reality", soundcloudId: 1241850 },
  { name: 'rocobruno - computer sounds', soundcloudId: 1295090 }
];

var gui;  

var controls = {
    enableFpsCounter : false,
    colorFade: 0.65,
    tentacles : {
      enable: true,
      beatDetect: true,
      scale : 1,
      thickness: 0.1,
      wobbleSpeed: 1
    },
    worm : {
      enable: true,
      autoMove: true, 
      speed: 1,
      horizontal: 0.1,
      vertical: 0.1,
      twirl: 0
    },
    volume : 100,
    music: tracks[0].name
  };

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     ||   
          function(callback, element){
            window.setTimeout(callback, 1000 / 60);
          };
})();

$(window).resize(function() {
  reloadCanvas();
});

$(function () {
  if (!reloadCanvas()) {
    return false;
  }

  var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  if (!is_chrome) {
    alert("You are advised to use Google Chrome for this. I am too lazy to port this webGL now :)");
    controls.tentacles.enable = false;
    controls.colorFade = 0;
  }

  init_controls();
  init_worm();
  init_tentacles();  

  if (!Date.now) {  
    Date.now = function now() {  
      return +new Date();  
    };  
  }

  var btime_ms = Date.now();
  var fps_ems = 999;
  var fpsc = 0;
  var render_time_per_s = 0;
  var avg_render_time = 0;


  (function animloop(){
    requestAnimFrame(animloop, canvas);
    
    var now = Date.now() - btime_ms;
    frametime_delta = now - time_ms;
    time_ms = now;
    time_s = time_ms / 1000;
    time_sPI  = time_s * PI;  
    time_sPI2 = time_s * PI2;  
    if (fps_counter_enabled && time_ms > fps_ems) {
      fps = fpsc;
      avg_render_time = render_time_per_s / fps;

      fps_ems = time_ms + 999;
      fpsc = 0;
      render_time_per_s = 0;
    }

    if (controls.worm.autoMove) {
      autoAlpha += controls.worm.speed;
      controls.worm.horizontal = Math.sin(autoAlpha * 0.0031);
      controls.worm.vertical = -Math.sin(autoAlpha * 0.0037); 
    }
    
    draw(canvas);
    
    fpsc++;
    render_time_per_s += Date.now() - btime_ms - now;

    if (controls.enableFpsCounter) {
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "white";            
      ctx.fillText("fps: "+ fps, 10, 16);
      ctx.fillText("render time: "+ avg_render_time.toFixed(2), 10, 32);
    }
  })();
});

function get_windims() {
  var windims = new Object;
  var w = window;
  var d = document;
  
  if (typeof w.innerWidth!='undefined') {
    windims.width = w.innerWidth;
    windims.height = w.innerHeight;
  } 
  else  {
    if (d.documentElement && 
        typeof d.documentElement.clientWidth != 'undefined' && 
        d.documentElement.clientWidth != 0) {
      windims.width  = d.documentElement.clientWidth;
      windims.height = d.documentElement.clientHeight;
    } 
    else  {
      if (d.body && 
          typeof d.body.clientWidth != 'undefined')  {
        windims.width = d.body.clientWidth;
        windims.height = d.body.clientHeight;
      }
      else {
        windims.width = null;
        windims.height = null;
      }
    }
  }

  return windims;
}

function reloadCanvas() {
  var windims = get_windims();
  if (windims.width == null || windims.height == null) {
    alert("Error in returned window dimensions");
    return false;
  } 

  canvas = document.getElementById("c");
  if (canvas == null) {
    alert("Couldn't get element canvas");
    return false;
  }
  
  if (typeof canvas.getContext == "undefined") {
    alert("Canvas element does not have a getContext method defined.");
    return false;
  }

  ctx = canvas.getContext("2d");
  if (ctx == null) {
    alert("Couldn't get element 2d context");
    return false;
  }

  canvas.width = windims.width;
  canvas.height = windims.height;
  
  return true;
}

function getTrackNames() {
  var rtn = [];
  for (var i = 0; i < tracks.length; i++) {
    rtn.push(tracks[i].name)
  }
  return rtn;
}

function getTrackIdByName(name) {
  for (var i = 0; i < tracks.length; i++) {
    if (tracks[i].name == name)
      return tracks[i].soundcloudId;
  }
  return 0;  
}

function init_controls() {
  gui = new dat.GUI();

  gui.add(controls, 'music', getTrackNames() ).onChange(function(name) {
    loadSoundCloudTrack(getTrackIdByName(name));
  });
  gui.add(controls, 'volume', 0, 100).onChange(function(volume) {
    soundManager.setVolume('track', volume); 
  });
  gui.add(controls, 'colorFade', 0, 1);
  gui.add(controls, 'enableFpsCounter');
  tentaclesFolder = gui.addFolder('tentacles');
  tentaclesFolder.add(controls.tentacles, 'enable');
  tentaclesFolder.add(controls.tentacles, 'beatDetect');
  tentaclesFolder.add(controls.tentacles, 'scale', 0.1, 3);
  tentaclesFolder.add(controls.tentacles, 'thickness', 0.01, 0.4);
  tentaclesFolder.add(controls.tentacles, 'wobbleSpeed', 0, 4);
  tentaclesFolder.open();
  wormFolder = gui.addFolder('worm');
  wormFolder.add(controls.worm, 'enable');
  wormFolder.add(controls.worm, 'autoMove');
  wormFolder.add(controls.worm, 'speed', 0, 4);
  wormFolder.add(controls.worm, 'horizontal', -1, 1).listen();
  wormFolder.add(controls.worm, 'vertical', -1, 1).listen();
  wormFolder.add(controls.worm, 'twirl', -10, 10).listen();
  wormFolder.open();

  
  $(canvas).mousedown(function(event) {
    md_x = event.screenX;
    md_y = event.screenY;
    md_s = Date.now();
    t_xrot_speed = 0; 
    t_yrot_speed = 0; 

    $(canvas).css('cursor', 'all-scroll');
  });

  // fixes cursor problems
  document.onselectstart = function () { return false; };

  $(canvas).mousemove(function(event) {

    var x = event.screenX;
    var y = event.screenY;

    if (md_s != null) {
      d_x = x - md_x;
      d_y = y - md_y;
      md_x = x;
      md_y = y;
     
      t_xrot_speed = d_y / 100; 
      t_yrot_speed = -d_x / 100; 
    } else {
      if (x >= t_bounds.minx && y >= t_bounds.miny && 
        x <= t_bounds.maxx && y <= t_bounds.maxy) {
        $(canvas).css('cursor', 'pointer');
      } else {
        $(canvas).css('cursor', '');
      }
    }
  });

  $(canvas).mouseup(function(event) {
    if (md_s != null) {
      md_s = null; 
      $(canvas).css('cursor', '');
    }
  });
}

soundManager.onready(function(){
  loadSoundCloudTrack(getTrackIdByName(controls.music));
});
   

function draw(canvas) {

  if (controls.colorFade > 0) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha= (1-controls.colorFade);
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0,0,canvas.width,canvas.height);  
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = canvas.width;
  }


  if (controls.worm.enable) {
    ctx.globalAlpha=  0.8;
    draw_worm();
  }
  
  if (controls.tentacles.enable) {
    ctx.globalAlpha=  0.5;
    ctx.globalCompositeOperation = "lighter";
    draw_tentacles();
  } 
}      



/*
---------------
TENTACLES
---------------
*/


var t_yrot_speed = 0.02, t_xrot_speed = 0.03, t_zrot_speed = 0.0;

var ZMAX = 4864;
var ZMIN = 1515;
var tentacle_radius = 1600
var tentacle_diameter = tentacle_radius *2; 
var point_count = 12; // has to be even number
var fat = 0;
var t_x = 0, t_y = 0, t_scale = 1;
var tent;
var zbuf = new Array(ZMAX - ZMIN);
var t_bounds = { maxx: 0, maxy: 0, minx: 99999, miny: 99999 };
//           z  neg                 x neg            z pos             x pos            y neg           y pos
var def_tent = [ [ 0, 0, -1, 1, 5], [ -1, 0, 0, 2, 5], [ 0, 0, 1, 1, 5], [ 1, 0, 0, 2, 5], [ 0, -1, 0, 1, 2], [ 0, 1, 0, 1, 2] ];

function init_tentacles() {
  tent = new Array(6);
  for (var i = 0; i < 6; i++) {
    tent[i] = new Object();
    tent[i].v = new Object();
    tent[i].v.x = def_tent[i][0];
    tent[i].v.y = def_tent[i][1];
    tent[i].v.z = def_tent[i][2];
    tent[i].p = new Array(point_count);
    for (var j = 0; j < point_count; j++) {
      tent[i].p[j] = new Object();
    }
  }
  
  for (var i = 0; i < zbuf.length; i++) {
    zbuf[i] = new Array();
  }
}

function draw_tentacles() {
  t_bounds = { maxx: 0, maxy: 0, minx: 99999, miny: 99999 };
  
  var translate_x, translate_y;
  var scale = t_scale * controls.tentacles.scale * 0.5;
  translate_x = ((canvas.width*scale)-canvas.width)*-0.5 + t_x; 
  translate_y = ((canvas.height*scale)-canvas.height)*-0.5 + t_y;
  ctx.translate(translate_x, translate_y);
  ctx.scale(scale, scale);
    
  ctx.globalAlpha= Math.min(1, scale * 0.3);


  //fat  = Math.sin(time_sPI2 * 0.125) * 0.05 + 0.1;
  fat = controls.tentacles.thickness;

  // get coordinates of quads
  make_tentacles();                     
                    
  // get colors                                        
  var fat_col = (5.5-fat)*7;
  var colors = new Array(point_count);
  var j = point_count-1;
  do {
    colors[j] = { 
      r: (Math.sin(time_sPI + j * 0.3) * 30 + fat_col),
      g: (Math.sin(time_sPI + j * 0.5) * 30 + fat_col),
      b: (Math.sin(time_sPI + j * 0.8) * 30 + fat_col)
    };
  }
  while(j--); 

  // draw quads
  var z = zbuf.length-1;
  do {
    var zbi_len = zbuf[z].length;
    if (zbi_len) {
      var p = zbi_len-1;
      do {

        pidx = zbuf[z][p];
        var t = pidx >> 16; 
        var j = (pidx >> 8) & 255; 
        var c = pidx & 255; 
        
        var v2 = tent[t].p[j];
        var v1 = tent[t].p[j-1];

        var depth_shade = 1.5 - (z / (ZMAX - ZMIN));
        if (scale < 1) {
          depth_shade *= scale;
        }

        ctx.fillStyle = 'rgb('+ 
          colors[j].r * depth_shade +'%,'+ 
          colors[j].g * depth_shade +'%,'+ 
          colors[j].b * depth_shade +'%)';

        t_bounds.maxy = Math.max(t_bounds.maxy, v1.y1, v1.y2, v1.y3, v1.y4, 
          v2.y1, v2.y2, v2.y3, v2.y4);
        t_bounds.minx = Math.min(t_bounds.minx, v1.x1, v1.x2, v1.x3, v1.x4, 
          v2.x1, v2.x2, v2.x3, v2.x4); 
        t_bounds.maxx = Math.max(t_bounds.maxx, v1.x1, v1.x2, v1.x3, v1.x4, 
          v2.x1, v2.x2, v2.x3, v2.x4); 
        t_bounds.miny = Math.min(t_bounds.miny, v1.y1, v1.y2, v1.y3, v1.y4, 
          v2.y1, v2.y2, v2.y3, v2.y4);

              
        ctx.beginPath();
        switch(c) {
          case 1:
            ctx.moveTo(v1.x1, v1.y1);
            ctx.lineTo(v2.x1, v2.y1);
            ctx.lineTo(v2.x4, v2.y4);
            ctx.lineTo(v1.x4, v1.y4);
            break;
          case 2:
            ctx.moveTo(v1.x2, v1.y2);
            ctx.lineTo(v2.x2, v2.y2);
            ctx.lineTo(v2.x3, v2.y3);
            ctx.lineTo(v1.x3, v1.y3);
            break;
          case 3:
            ctx.moveTo(v1.x3, v1.y3);
            ctx.lineTo(v2.x3, v2.y3);
            ctx.lineTo(v2.x4, v2.y4);
            ctx.lineTo(v1.x4, v1.y4);
            break;
          case 4:
            ctx.moveTo(v1.x1, v1.y1);
            ctx.lineTo(v2.x1, v2.y1);
            ctx.lineTo(v2.x2, v2.y2);
            ctx.lineTo(v1.x2, v1.y2);
            break;
        }
        ctx.fill();              
      }
      while(p--);
      
      zbuf[z].length = 0;
    }
  }
  while(z--);                                                  
          
  t_bounds.minx = t_bounds.minx * scale + translate_x;
  t_bounds.miny = t_bounds.miny * scale + translate_y;
  t_bounds.maxx = t_bounds.maxx * scale + translate_x;
  t_bounds.maxy = t_bounds.maxy * scale + translate_y;

  ctx.scale(1/scale, 1/scale);

  ctx.translate(-translate_x, -translate_y);
}


function rot3d(p, xrot, yrot, zrot) {
  pr = new Object();
  var x1 = p.z * Math.sin(yrot) + p.x * Math.cos(yrot);
  var y1 = p.y;
  var z1 = p.z * Math.cos(yrot) - p.x * Math.sin(yrot);
  var x2 = x1;
  var y2 = y1 * Math.cos(xrot) - z1 * Math.sin(xrot);
  pr.z = y1 * Math.sin(xrot) + z1 * Math.cos(xrot);
  pr.x = y2 * Math.sin(zrot) + x2 * Math.cos(zrot);
  pr.y = y2 * Math.cos(zrot) - x2 * Math.sin(zrot);
  return pr;
}

function make_tentacles() {

  var center_x = canvas.width * 0.5;             
  var center_y = canvas.height * 0.5;             

  for (var i = 0; i < 6; i++) {
    tent[i].v = rot3d(
      tent[i].v,
      t_xrot_speed, t_yrot_speed, t_zrot_speed
    );
  }

  var ui,ux,uy,uz,vx,vy,vz,cx,cy,cz,fov,wux,wuy,wuz,wvx,wvy,wvz;
  var wobble,v2,v1,tp,ij;
  var l_inc = tentacle_radius / point_count;
  var i = 5;
  var tent_fat = fat * tentacle_radius;
  var w_dec = tent_fat / point_count;
  var ww = Math.sin(time_sPI2 * 0.2*controls.tentacles.wobbleSpeed) * 0.4;
  do {
    l = 0;
    width = tent_fat;
    for (j = 0; j < point_count; j++) {
      tp = tent[i].p[j];
      width -= w_dec;
      wobble = Math.sin( 
        (j*(i+1) / point_count * HALFPI) + (time_sPI2*controls.tentacles.wobbleSpeed)
        ) * l * ww;
    
      ui = tent[def_tent[i][3]].v;
      ux = ui.x;
      uy = ui.y;
      uz = ui.z;
      ui = tent[def_tent[i][4]].v;
      vx = ui.x;
      vy = ui.y;
      vz = ui.z;

      wux = width * ux;
      wuy = width * uy;
      wuz = width * uz;
      wvx = width * vx;
      wvy = width * vy;
      wvz = width * vz;
                
      cx = (tent[i].v.x * l) + (wobble * ux);
      cy = (tent[i].v.y * l) + (wobble * uy);
      cz = (tent[i].v.z * l) + (wobble * uz);
      
      px = cx + wux + wvx; 
      py = cy + wuy + wvy; 
      pz = cz + wuz + wvz + tentacle_diameter; 
      fov = (pz * 0.00167);
      tp.x1 = (px / fov) + center_x;
      tp.y1 = (py / fov) + center_y;
      tp.z1 = pz;

      px = cx - wux + wvx; 
      py = cy - wuy + wvy; 
      pz = cz - wuz + wvz + tentacle_diameter; 
      fov = (pz * 0.00167);
      tp.x2 = (px / fov) + center_x;
      tp.y2 = (py / fov) + center_y;
      tp.z2 = pz;
       
      px = cx - wux - wvx; 
      py = cy - wuy - wvy; 
      pz = cz - wuz - wvz + tentacle_diameter; 
      fov = (pz * 0.00167);
      tp.x3 = (px / fov) + center_x;
      tp.y3 = (py / fov) + center_y;
      tp.z3 = pz;

      px = cx + wux - wvx; 
      py = cy + wuy - wvy; 
      pz = cz + wuz - wvz + tentacle_diameter; 
      fov = (pz * 0.00167);
      tp.x4 = (px / fov) + center_x;
      tp.y4 = (py / fov) + center_y;
      tp.z4 = pz;
      
      l += l_inc;
      
      // save 4 quads in zbuf for fast poly ordering
      if (j) {
        v2 = tp;
        v1 = tent[i].p[j-1];
        ij = i << 16 | j << 8;

        // get average z for storage in zbuf             
        z = (Math.round(v1.z1 + v2.z1 + v2.z4 + v1.z4) >> 2) - ZMIN;
        zl = zbuf[z].length;
        if (zl)
          zbuf[z][zl] = ij | 1;
        else
          zbuf[z][0] = ij | 1; 
        z = (Math.round(v1.z2 + v2.z2 + v2.z3 + v1.z3)  >> 2)  - ZMIN;
        zl = zbuf[z].length;
        if (zl)
          zbuf[z][zl] = ij | 2; 
        else
          zbuf[z][0] = ij | 2; 
        z = (Math.round(v1.z3 + v2.z3 + v2.z4 + v1.z4) >> 2) - ZMIN;
        var zl = zbuf[z].length;
        if (zl)
          zbuf[z][zl] = ij | 3; 
        else
          zbuf[z][0] = ij | 3; 
        z = (Math.round(v1.z1 + v2.z1 + v2.z2 + v1.z2) >> 2) - ZMIN;
        zl = zbuf[z].length;
        if (zl)
          zbuf[z][zl] = ij | 4;  
        else
          zbuf[z][0] = ij | 4; 
      }             
    }
  }
  while(i--);
}

/*
---------------
WORM
---------------
*/

var worm;
var worm_zmax_idx = 0;

var RING_DEPTH = 240;
var MAX_WORM_SPEED =  RING_DEPTH / (1000/10);
var WZMIN = 0;
var WORM_RING_COUNT  = 30;
var WZMAX = WORM_RING_COUNT * RING_DEPTH + WZMIN;
var WORM_RING_SEGMENTS = 64;
var WORM_INACTIVE_RING_R = 10, WORM_INACTIVE_RING_G = 10, WORM_INACTIVE_RING_B = 10;

function init_worm() {
  worm = new Array(WORM_RING_COUNT);
  worm_zmax_idx = 0;
  
  var k = 100 / WORM_RING_COUNT; 
  for (var i = 0; i < WORM_RING_COUNT; i++) {
    worm[i] = { 
      id : i,
      p : new Array(WORM_RING_SEGMENTS), 
      z : (WORM_RING_COUNT-1 - i) * RING_DEPTH,
      xmov : 0,
      ymov : 0 
    };
    for (var j = 0; j < WORM_RING_SEGMENTS; j++) {
      worm[i].p[j] = { x: 0, y: 0, r: WORM_INACTIVE_RING_R, g: WORM_INACTIVE_RING_G, b: WORM_INACTIVE_RING_B };
    }
  }
}

function draw_worm() {

  make_worm();
  
  var worm_zmin_idx = worm_zmax_idx-1;
  if (worm_zmin_idx < 0)
    worm_zmin_idx = WORM_RING_COUNT-1;
  var i_next;
  var i = worm_zmax_idx;
  if (i % 2 == 1) {
    i++;
    if (i >= WORM_RING_COUNT)
      i = 0;
  }
  do {
    i_next = i+1;
    if (i_next >= WORM_RING_COUNT)
      i_next = 0;
    
    var znorm = 1- ((worm[i].z-WZMIN) / (WZMAX-WZMIN));

    for (var j = 0; j < WORM_RING_SEGMENTS; j+=2) {
      var p1, p2, p3, p4;
      var j_next = j+1;
      if (j_next >= WORM_RING_SEGMENTS)
        j_next = 0;
      p1 = worm[i].p[j];
      p2 = worm[i].p[j_next];
      p3 = worm[i_next].p[j];
      p4 = worm[i_next].p[j_next];

      var r = worm[i].p[j].r*znorm;
      var g = worm[i].p[j].g*znorm;
      var b = worm[i].p[j].b*znorm;

      ctx.fillStyle = 'rgb('+ r +'%,'+ g +'%,'+ b +'%)';
    
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.fill();
    }
    
    i = i_next;

    if (i == worm_zmin_idx) break;
    i++;
    if (i >= WORM_RING_COUNT)
      i = 0;
  } 
  while(i != worm_zmin_idx)
}
            
function make_worm() {
  
  var reset_i = null;
  var delta_z = Math.min(100, frametime_delta * controls.worm.speed);
  for (var i = 0; i < WORM_RING_COUNT; i++) {
    var z = worm[i].z - delta_z;
    if (z < WZMIN) {
      reset_i  = i;
    }
    worm[i].z = z;
  }
  
  if (reset_i != null) {
    var i = reset_i;
    worm[i].z = worm[worm_zmax_idx].z + RING_DEPTH;
    worm_zmax_idx = i;
    
    worm[i].xmov = controls.worm.horizontal;
    worm[i].ymov = controls.worm.vertical;
  }

  var center_x = canvas.width  * 0.5;
  var center_y = canvas.height * 0.5;
  var worm_radius = Math.max(canvas.width, canvas.height) / 95; 

  var depth = 1;
  var depth_dec = 1/ WORM_RING_COUNT;
  var depth_id = 0;

  var i = worm_zmax_idx;
  var radinc = PI2 / WORM_RING_SEGMENTS;
  do {
    var rad = -worm[i].xmov*(depth+1);
    rad += controls.worm.twirl * depth;
    var z = worm[i].z;
    depth = (worm[i].z-WZMIN) / (WZMAX-WZMIN);
    
    var d = 1-Math.sin((1-depth)*HALFPI); // depth in curve
    d += 0.02; // adds inverse camera movement
    d *= worm_radius * 12; // max curve

    for (var j = 0; j < WORM_RING_SEGMENTS; j++) {
      var x = (Math.sin(rad) * worm_radius) + worm[i].xmov * d;
      var y = (Math.cos(rad) * worm_radius) + worm[i].ymov * d;
      worm[i].p[j].x = x + (x*15000) / z + center_x;
      worm[i].p[j].y = y + (y*15000) / z + center_y;

      rad += radinc;
    }
  
    depth -= depth_dec;
    depth_id++;

    i++;
    if (i >= WORM_RING_COUNT)
      i = 0;
  } 
  while(i != worm_zmax_idx)
}


/*
---------------
SOUND & BEAT DETECTION
---------------
*/

soundManager.url = '';
soundManager.flashVersion = 9;
soundManager.debugFlash = false;
soundManager.debugMode = false;
soundManager.preferFlash = true;
soundManager.flashLoadTimeout = 10000;
// soundManager.flashPollingInterval = 1000/60; // 60fps is assumed (but never reached on my machine)
soundManager.useHighPerformance = true;

var beat = null;
var BR_SAMPLE_COUNT = 256; 
var BR_CUTOFF_FREQ =  Math.round(500 / (22050 / 256)); // 500hz
var beatrange; // low frequence range
var beatrange_i = 0;

init_beatrange();

function init_beatrange() {
  beatrange = new Array(BR_SAMPLE_COUNT);
  for (var i = 0; i < BR_SAMPLE_COUNT; i++) {
    beatrange[i] = new Array(BR_CUTOFF_FREQ);
  }
}

function updateBeatrange(eqData) {
  var i = beatrange_i % BR_SAMPLE_COUNT;
  for (var f = 0; f < BR_CUTOFF_FREQ; f++) {
    beatrange[i][f] = Math.max(eqData.left[f], eqData.right[f]);
  }
  beatrange_i++;
}

function getBeatrangeWeights() {
  var sample_count = beatrange_i < BR_SAMPLE_COUNT ? beatrange_i : BR_SAMPLE_COUNT;
  
  // find avg 
  var avg = new Array(BR_CUTOFF_FREQ);
  for (var f = 0; f < BR_CUTOFF_FREQ; f++) {
    var w = 0;
    for (var i = 0; i < sample_count; i++) {
      w += beatrange[i][f];
    }
    avg[f] = w / sample_count;
  }
  
  // count below average & above average
  // and get spread
  var lcount = new Array(BR_CUTOFF_FREQ);
  var hcount = new Array(BR_CUTOFF_FREQ);
  var spread = new Array(BR_CUTOFF_FREQ);
  var distance = new Array(BR_CUTOFF_FREQ); 
  for (var f = 0; f < BR_CUTOFF_FREQ; f++) {
    var lc = 0, hc = 0, min = beatrange[0][f], max = beatrange[0][f], d = 0;
    for (var i = 0; i < sample_count; i++) {
      min = Math.min(min, beatrange[i][f]);
      max = Math.max(max, beatrange[i][f]);
      if (i > 1) {
        d += Math.abs(beatrange[i-1][f] - beatrange[i][f]); 
      }
      if (beatrange[i][f] < avg[f])
        lc++;
      else
        hc++;
    }
    lcount[f] = lc;
    hcount[f] = hc;
    spread[f] = max- min;
    distance[f] = d;
  }
  
  // determine weight by preferring bigger spread and
  // bigger spread of lcount and hcount
  var rtn = new Array(BR_CUTOFF_FREQ);
  var min = null;
  var max = null;
  for (var f = 0; f < BR_CUTOFF_FREQ; f++) {
    rtn[f] = Math.pow(spread[f],16) * distance[f];
    min = min == null ? min = rtn[f] : Math.min(rtn[f], min);     
    max = max == null ? max = rtn[f] : Math.max(rtn[f], max);     
  }
  
  // normalize weights    
  for (var f = 0; f < BR_CUTOFF_FREQ; f++) {
    rtn[f] = (rtn[f] - min) / (max - min); 
  }
  
  return rtn;
}

var lh = null;
var lh_dec = 2;

function detectBeat(eqData) {
  updateBeatrange(eqData);
  brw = getBeatrangeWeights();

  var max = eqData.left[0]; 
  for (var i = 0; i <BR_CUTOFF_FREQ; i++) {
    max = Math.max(max, eqData.left[i] *brw[i]); 
  }

  var h = max;
  if (h >= lh || lh == null) {
    lh_dec = 2;
  }
  else if (h < lh) {
    h = lh - (lh_dec/50);
    lh_dec++;
  }  
  lh = h;

  return lh;
}

function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
}

function colorWorm(eqData) {
  for (var ring = 0; ring < WORM_RING_COUNT; ring++) {
      var freq = Math.floor((worm[ring].id / WORM_RING_COUNT) * 128);
      var hue_dec = 120 / (WORM_RING_SEGMENTS/2);
      var hue = 120;
      var c;
      for (var segment = 0; segment < WORM_RING_SEGMENTS/2; segment++) {
        var segment_freq =  segment / (WORM_RING_SEGMENTS/2);
        if (eqData.right[freq] > segment_freq) {
          c = hslToRgb(hue/360, 0.55, 0.5);
          worm[ring].p[segment].r = c[0];
          worm[ring].p[segment].g = c[1];
          worm[ring].p[segment].b = c[2];

        } else {
          worm[ring].p[segment].r = WORM_INACTIVE_RING_R;
          worm[ring].p[segment].g = WORM_INACTIVE_RING_G;
          worm[ring].p[segment].b = WORM_INACTIVE_RING_B;
        }
        hue -= hue_dec;
      } 
      hue = 0;
      for (; segment < WORM_RING_SEGMENTS; segment++) {
        var segment_freq =  1-((segment-WORM_RING_SEGMENTS/2) / (WORM_RING_SEGMENTS/2));
        if (eqData.left[freq] > segment_freq) {
          c = hslToRgb(hue/360, 0.55, 0.5);
          worm[ring].p[segment].r = c[0];
          worm[ring].p[segment].g = c[1];
          worm[ring].p[segment].b = c[2];

        } else {
          worm[ring].p[segment].r = WORM_INACTIVE_RING_R;
          worm[ring].p[segment].g = WORM_INACTIVE_RING_G;
          worm[ring].p[segment].b = WORM_INACTIVE_RING_B;
        }
        hue -= hue_dec;
      } 
  }
}

function getFallEqData(inEqData) {
  var EQ_FALL_SPEED = 0.05;
  if (typeof lastEqData == "undefined") {
    lastEqData = { left : [], right : [] };
  }

  var outEqData = { left : [], right : [] };
  for (var i = 0; i < 256; i++) {
    var l = inEqData.left[i];
    var ll = lastEqData.left[i];
    var r = inEqData.right[i];
    var lr = lastEqData.right[i];

    l = l < ll ? Math.max(0, ll - EQ_FALL_SPEED) : l;
    r = r < lr ? Math.max(0, lr - EQ_FALL_SPEED) : r;

    outEqData.left[i]  = l;
    outEqData.right[i] = r;
  }

  for (var i = 0; i < 256; i++) {
    lastEqData.left[i]  = outEqData.left[i];
    lastEqData.right[i] = outEqData.right[i];
  }

  return outEqData;
}

function onEqData() {
  // scale tentacles on beat
  if (controls.tentacles.beatDetect) {
    t_scale = detectBeat(this.eqData) * 2 + 0.5;
  } else {
    t_scale = 1.5;
  }

  // color worm on frequencies
  colorWorm(getFallEqData(this.eqData));
}

function loopSound(soundID, options) {
// http://getsatisfaction.com/schillmania/topics/looping_tracks_in_soundmanager_2
  options.onfinish = function() { loopSound(soundID, options); }; 
  window.setTimeout(function() {
    soundManager.play(soundID, options);
  },1);
}

function loadSoundCloudTrack(track_id) {
  if (track_id <= 0)
    return;

  soundManager.stopAll();
  soundManager.destroySound('track');

  $.getJSON('http://www.mrhobo.nl/soundcloud/sc_trackinfo.php?id='+ track_id +'&nocache=1', function(track) {
    track = soundManager.createSound({
      id: 'track',
      url: track.redirect_url,
      usePeakData: false,
      useEQData: true
    });
    
    loopSound('track', { volume: controls.volume, whileplaying: onEqData });
  });  
}
