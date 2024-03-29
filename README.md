# TANlock Manager - Server

> REST Server Component for the TANlock Manager

[![Build Status](https://travis-ci.com/FATH-Mechatronics/TANlockManager-Server.svg?branch=master)](https://travis-ci.com/FATH-Mechatronics/TANlockManager-Server)

## Build and Run

```bash
# Init 
$ yarn

# Build TypeScript
$ yarn build

# Run Productive
$ node .
```

## Configuration

The Server can be configured by a config.json in the current working directory.

```json
{
  "basePath": "/etc/tanlockmanager"
}
```

### Possible Values

| Key      | Type   | Default                                                      |
|----------|--------|--------------------------------------------------------------|
| basePath | string | `%APPDATA%\tanlockmanager` or `$HOME/.config/tanlockmanager` |

