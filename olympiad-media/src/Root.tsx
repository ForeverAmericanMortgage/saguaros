import React from 'react';
import { Composition } from 'remotion';
import { Explainer } from './Explainer';
import { FPS, sec, TOTAL } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    {/* Website, YouTube, email: 16:9 */}
    <Composition id="Explainer-16x9" component={Explainer} durationInFrames={sec(TOTAL)} fps={FPS} width={1920} height={1080} />
    {/* Instagram Reels, Stories, LinkedIn mobile: 9:16 */}
    <Composition id="Explainer-9x16" component={Explainer} durationInFrames={sec(TOTAL)} fps={FPS} width={1080} height={1920} />
  </>
);
