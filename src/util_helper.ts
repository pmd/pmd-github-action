import * as os from 'os'

export function getPlatform(): NodeJS.Platform {
    return os.platform()
}
