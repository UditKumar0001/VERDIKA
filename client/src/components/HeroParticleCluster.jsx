import React, { useEffect, useRef } from 'react';

/**
 * HeroParticleCluster
 * An ambient, lightweight canvas-based particle constellation visual
 * representing multi-agent data streams converging into an intelligent underwriting core.
 */
export default function HeroParticleCluster() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    const numParticles = 48;
    const colors = [
      'rgba(99, 102, 241, ', // Indigo
      'rgba(56, 189, 248, ', // Sky Blue
      'rgba(34, 211, 238, ', // Cyan
      'rgba(16, 185, 129, ', // Emerald
      'rgba(139, 92, 246, '  // Violet
    ];

    // Generate orbiting particles with 3D elliptical trajectories
    const particles = Array.from({ length: numParticles }, (_, i) => {
      const orbitRadiusX = 50 + Math.random() * 150;
      const orbitRadiusY = orbitRadiusX * (0.35 + Math.random() * 0.3);
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.003 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1);
      const tilt = (Math.PI / 6) * (Math.random() * 2 - 1);
      const colorBase = colors[i % colors.length];
      const baseSize = 1.8 + Math.random() * 2.4;
      const depthOffset = Math.random() * Math.PI * 2;

      return {
        orbitRadiusX,
        orbitRadiusY,
        angle,
        speed,
        tilt,
        colorBase,
        baseSize,
        depthOffset,
        z: 0,
        x: 0,
        y: 0
      };
    });

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Draw Subtle Glowing Ambient Core (Multi-Agent Neural Hub)
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 140);
      coreGlow.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
      coreGlow.addColorStop(0.4, 'rgba(56, 189, 248, 0.10)');
      coreGlow.addColorStop(0.8, 'rgba(34, 211, 238, 0.02)');
      coreGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 140, 0, Math.PI * 2);
      ctx.fill();

      // 2. Faint Concentric Orbit Guide Rings
      [65, 110, 155].forEach((r, idx) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((idx % 2 === 0 ? 1 : -1) * time * 0.08);
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.55, idx * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 - idx * 0.02})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.restore();
      });

      // 3. Central Focal Orb
      const orbPulse = 12 + Math.sin(time * 2) * 2;
      const orbGlow = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, orbPulse * 2.5);
      orbGlow.addColorStop(0, '#38bdf8');
      orbGlow.addColorStop(0.3, 'rgba(99, 102, 241, 0.85)');
      orbGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbPulse * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // 4. Update and Project Particle Positions
      particles.forEach((p) => {
        p.angle += p.speed;

        // Parametric 3D rotation
        const rawX = Math.cos(p.angle) * p.orbitRadiusX;
        const rawY = Math.sin(p.angle) * p.orbitRadiusY;

        // Apply tilt
        const tiltedX = rawX * Math.cos(p.tilt) - rawY * Math.sin(p.tilt);
        const tiltedY = rawX * Math.sin(p.tilt) + rawY * Math.cos(p.tilt);

        p.x = centerX + tiltedX;
        p.y = centerY + tiltedY;
        p.z = Math.sin(p.angle + p.depthOffset); // -1 (back) to 1 (front)
      });

      // 5. Draw Neural Constellation Connection Lines (Only between nearby particles)
      const maxConnectDist = 65;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const lineAlpha = (1 - dist / maxConnectDist) * 0.28 * Math.max(0.2, (p1.z + 1.2) / 2.2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 6. Draw Particles with Depth Scaling
      // Sort back-to-front for proper depth perception
      particles
        .slice()
        .sort((a, b) => a.z - b.z)
        .forEach((p) => {
          const depthNorm = (p.z + 1) / 2; // 0 (far) to 1 (near)
          const alpha = 0.25 + depthNorm * 0.75;
          const radius = Math.max(1.2, p.baseSize * (0.6 + depthNorm * 0.7));

          // Soft particle halo
          if (depthNorm > 0.6) {
            const haloGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.8);
            haloGrad.addColorStop(0, `${p.colorBase}${alpha * 0.5})`);
            haloGrad.addColorStop(1, `${p.colorBase}0)`);
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius * 2.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Solid particle core
          ctx.fillStyle = `${p.colorBase}${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="hero-particle-container" aria-hidden="true">
      <canvas ref={canvasRef} className="hero-particle-canvas" />
      {/* Decorative Agent Orbit Tags */}
      <div className="particle-agent-tag tag-data">DataAgent: 30 Cycles</div>
      <div className="particle-agent-tag tag-risk">Risk Score: 0.15 ✓</div>
      <div className="particle-agent-tag tag-adv">Adversarial: Clean</div>
      <div className="particle-agent-tag tag-decision">Decision: Approved</div>
    </div>
  );
}
