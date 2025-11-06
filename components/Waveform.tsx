import React, { useRef, useEffect } from 'react';

interface WaveformProps {
  audioContext: AudioContext | null;
  mediaStream: MediaStream | null;
  isActive: boolean;
}

const Waveform: React.FC<WaveformProps> = ({ audioContext, mediaStream, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!audioContext || !mediaStream || !isActive || !canvas) {
      return;
    }

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let animationFrameId: number;
    
    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);

      const parentBg = window.getComputedStyle(canvas.parentElement!).backgroundColor;
      canvasCtx.fillStyle = parentBg;
      
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2.5;
        
        canvasCtx.fillStyle = `rgba(20, 184, 166, ${barHeight / 100})`; // teal-600 with opacity
        
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      try {
        source.disconnect();
      } catch (e) {
        // Ignore errors on disconnect, as context might already be closed
      }
    };
  }, [audioContext, mediaStream, isActive]);

  return <canvas ref={canvasRef} width="300" height="80" className="mt-4 rounded-lg"/>;
};

export default Waveform;
