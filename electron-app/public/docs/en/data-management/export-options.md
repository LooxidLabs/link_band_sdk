# Export Options

Link Band SDK can export collected data in various formats and options. You can choose optimal export settings according to requirements such as research purposes, analysis tools, and storage space.

## Supported File Formats

### JSON Format
- **Advantages**: Structured data, includes metadata, web-friendly
- **Disadvantages**: Large file size
- **Use Cases**: Web applications, API integration, structured analysis

```json
{
  "sensors": {
    "EEG": {
      "enabled": true,
      "channels": ["CH1", "CH2", "CH3", "CH4"],
      "data_type": "processed"
    },
    "PPG": {
      "enabled": true,
      "data_type": "raw"
    },
    "ACC": {
      "enabled": false
    }
  }
}
```

### Data Processing
Provides both raw data and processed data:

- **Raw Data**: Unfiltered original data
- **Processed Data**: Includes analysis results (indices) after noise removal and filtering

## Troubleshooting

### Common Issues
1. **Out of Memory**: When exporting large datasets
2. **Insufficient Disk Space**: Check output directory capacity
3. **Permission Error**: Write permissions for output directory
4. **Network Error**: Cloud upload failure

You can efficiently utilize Link Band data through export functionality. 