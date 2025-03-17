import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  IconButton,
  Slider,
  Typography,
  Tooltip,
} from '@material-ui/core';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  Tune as EffectsIcon,
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  root: {
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
  volumeControl: {
    display: 'flex',
    alignItems: 'center',
    width: 200,
  },
  slider: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  effectsButton: {
    marginLeft: 'auto',
  },
}));

function AudioControls({ audioService, pathRecorder }) {
  const classes = useStyles();
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
    <Paper className={classes.root} elevation={3}>
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
    </Paper>
  );
}

export default AudioControls; 