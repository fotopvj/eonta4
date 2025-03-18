import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  IconButton,
  Slider,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  Tune as EffectsIcon,
} from '@mui/icons-material';

const PREFIX = 'AudioControls';

const classes = {
  root: `${PREFIX}-root`,
  volumeControl: `${PREFIX}-volumeControl`,
  slider: `${PREFIX}-slider`,
  effectsButton: `${PREFIX}-effectsButton`,
};

const Root = styled(Paper)(({ theme }) => ({
  [`&.${classes.root}`]: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1,
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    minWidth: 300,
  },
  [`& .${classes.volumeControl}`]: {
    display: 'flex',
    alignItems: 'center',
    width: 200,
  },
  [`& .${classes.slider}`]: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  [`& .${classes.effectsButton}`]: {
    marginLeft: 'auto',
  },
}));

function AudioControls({ audioService, pathRecorder }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(100);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioService?.suspendAudio();
    } else {
      audioService?.resumeAudio();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (audioService?.masterGain) {
      audioService.masterGain.gain.value = newValue / 100;
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(previousVolume);
      if (audioService?.masterGain) {
        audioService.masterGain.gain.value = previousVolume / 100;
      }
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      if (audioService?.masterGain) {
        audioService.masterGain.gain.value = 0;
      }
    }
    setIsMuted(!isMuted);
  };

  const handleEffectsClick = () => {
    // TODO: Implement effects panel
    console.log('Effects panel clicked');
  };

  return (
    <Root className={classes.root} elevation={3}>
      <IconButton
        color={isPlaying ? "secondary" : "primary"}
        onClick={handlePlayPause}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </IconButton>

      <div className={classes.volumeControl}>
        <IconButton onClick={handleMuteToggle}>
          {isMuted ? <MuteIcon /> : <VolumeIcon />}
        </IconButton>
        <Slider
          className={classes.slider}
          value={volume}
          onChange={handleVolumeChange}
          aria-labelledby="volume-slider"
          min={0}
          max={100}
        />
        <Typography variant="body2">
          {volume}%
        </Typography>
      </div>

      <Tooltip title="Audio Effects">
        <IconButton
          className={classes.effectsButton}
          onClick={handleEffectsClick}
          color="primary"
        >
          <EffectsIcon />
        </IconButton>
      </Tooltip>
    </Root>
  );
}

export default AudioControls; 