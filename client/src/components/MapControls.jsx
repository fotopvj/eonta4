import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  FiberManualRecord as RecordIcon,
  Stop as StopIcon,
  Battery20 as BatteryIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

const PREFIX = 'MapControls';

const classes = {
  root: `${PREFIX}-root`,
  formControl: `${PREFIX}-formControl`,
  button: `${PREFIX}-button`,
  batteryWarning: `${PREFIX}-batteryWarning`,
  performanceMode: `${PREFIX}-performanceMode`,
};

const Root = styled(Paper)(({ theme }) => ({
  [`&.${classes.root}`]: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
    padding: theme.spacing(2),
    minWidth: 250,
  },
  [`& .${classes.formControl}`]: {
    marginTop: theme.spacing(2),
    minWidth: 200,
  },
  [`& .${classes.button}`]: {
    marginTop: theme.spacing(2),
  },
  [`& .${classes.batteryWarning}`]: {
    color: theme.palette.error.main,
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    '& > svg': {
      marginRight: theme.spacing(1),
    },
  },
  [`& .${classes.performanceMode}`]: {
    display: 'flex',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    '& > svg': {
      marginRight: theme.spacing(1),
    },
  },
}));

function MapControls({ mapService, pathRecorder, mobileOptimizer }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mapQuality, setMapQuality] = useState('high');
  const [performanceMode, setPerformanceMode] = useState(false);

  const handleRecordToggle = () => {
    if (isRecording) {
      pathRecorder?.stopRecording();
    } else {
      pathRecorder?.startRecording();
    }
    setIsRecording(!isRecording);
  };

  const handleMapQualityChange = (event) => {
    const quality = event.target.value;
    setMapQuality(quality);
    mapService?.setMapQuality(quality);
  };

  const handlePerformanceModeToggle = () => {
    const newMode = !performanceMode;
    setPerformanceMode(newMode);
    if (newMode) {
      mapService?.setRefreshRate(2000);
      mapService?.setMapQuality('low');
    } else {
      mapService?.setRefreshRate(1000);
      mapService?.setMapQuality('high');
    }
  };

  return (
    <Root className={classes.root} elevation={3}>
      <Typography variant="h6" gutterBottom>
        Map Controls
      </Typography>

      <Button
        variant="contained"
        color={isRecording ? "secondary" : "primary"}
        className={classes.button}
        startIcon={isRecording ? <StopIcon /> : <RecordIcon />}
        onClick={handleRecordToggle}
        fullWidth
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Button>

      <FormControl className={classes.formControl}>
        <InputLabel>Map Quality</InputLabel>
        <Select
          value={mapQuality}
          onChange={handleMapQualityChange}
          disabled={performanceMode}
        >
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="low">Low</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={performanceMode}
            onChange={handlePerformanceModeToggle}
            name="performanceMode"
            color="primary"
          />
        }
        label="Performance Mode"
        className={classes.formControl}
      />

      {mobileOptimizer?.isLowPowerMode && (
        <Typography variant="body2" className={classes.batteryWarning}>
          <BatteryIcon />
          Low Battery Mode Active
        </Typography>
      )}

      {performanceMode && (
        <Typography variant="body2" className={classes.performanceMode}>
          <SpeedIcon />
          Performance Mode Active
        </Typography>
      )}
    </Root>
  );
}

export default MapControls; 