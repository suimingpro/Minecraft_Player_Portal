'use client';
import React, { useEffect, useRef } from 'react';

interface SkinViewerProps {
  skinUrl: string | null;
  capeUrl?: string | null;
  width?: number;
  height?: number;
}

const STEVE_SKIN = 'https://crafatar.com/skins/8667ba71b85a4004af54457a9734eed7';

export default function SkinViewer({ skinUrl, capeUrl, width = 220, height = 380 }: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    let cleanupPointerListeners: (() => void) | null = null;

    (async () => {
      try {
        const [{ SkinViewer, WalkingAnimation }, fxaaModule] = await Promise.all([
          import('skinview3d'),
          import('three/examples/jsm/shaders/FXAAShader.js' as any).catch(() => null),
        ]);

        if (fxaaModule?.FXAAShader?.fragmentShader) {
          // Fix WebGL / DirectX HLSL compiler warning X4713
          // Clamps texture2D Sample Bias from -100.0 to -16.0 (valid range: [-16.00, 15.99])
          fxaaModule.FXAAShader.fragmentShader = fxaaModule.FXAAShader.fragmentShader.replaceAll(
            '-100.0',
            '-16.0'
          );
        }

        if (cancelled || !canvas) return;

        if (viewerRef.current) {
          viewerRef.current.dispose();
          viewerRef.current = null;
        }

        const validSkin = (skinUrl && skinUrl.trim()) ? skinUrl : STEVE_SKIN;

        const viewer = new SkinViewer({
          canvas,
          width,
          height,
          skin: validSkin,
        });

        if (capeUrl && capeUrl.trim()) {
          try {
            await viewer.loadCape(capeUrl);
          } catch (e) {
            console.warn('Cape load failed:', e);
          }
        }

        viewer.autoRotate = true;
        viewer.autoRotateSpeed = 0.8;
        viewer.animation = new WalkingAnimation();
        (viewer.animation as any).speed = 0.6;
        viewer.fov = 70;
        viewer.zoom = 0.9;

        if (viewer.controls) {
          viewer.controls.enableRotate = true;
          viewer.controls.enableZoom = true;
          viewer.controls.enablePan = false;
        }

        // Smooth turntable drag-to-rotate support
        let isDragging = false;
        let prevX = 0;
        let prevY = 0;

        const handlePointerDown = (e: PointerEvent) => {
          isDragging = true;
          prevX = e.clientX;
          prevY = e.clientY;
          viewer.autoRotate = false;
          canvas.style.cursor = 'grabbing';
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {}
        };

        const handlePointerMove = (e: PointerEvent) => {
          if (!isDragging) return;
          const deltaX = e.clientX - prevX;
          const deltaY = e.clientY - prevY;
          prevX = e.clientX;
          prevY = e.clientY;

          // Rotate player horizontally
          viewer.playerWrapper.rotation.y += deltaX * 0.015;
          // Limit vertical tilt
          viewer.playerWrapper.rotation.x = Math.max(
            -Math.PI / 5,
            Math.min(Math.PI / 5, viewer.playerWrapper.rotation.x + deltaY * 0.01)
          );
        };

        const handlePointerUp = (e: PointerEvent) => {
          if (!isDragging) return;
          isDragging = false;
          canvas.style.cursor = 'grab';
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {}
          viewer.autoRotate = true;
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointercancel', handlePointerUp);

        cleanupPointerListeners = () => {
          canvas.removeEventListener('pointerdown', handlePointerDown);
          canvas.removeEventListener('pointermove', handlePointerMove);
          canvas.removeEventListener('pointerup', handlePointerUp);
          canvas.removeEventListener('pointercancel', handlePointerUp);
        };

        viewerRef.current = viewer;
      } catch (err) {
        console.error('Failed to init SkinViewer:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (cleanupPointerListeners) {
        cleanupPointerListeners();
      }
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [skinUrl, capeUrl, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width,
        height,
        display: 'block',
        borderRadius: 8,
        cursor: 'grab',
        touchAction: 'none',
      }}
    />
  );
}
