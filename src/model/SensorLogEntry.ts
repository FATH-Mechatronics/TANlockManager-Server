export default interface SensorLogEntry {
    lock: string,
    time: number,
    end: number,
    type: string,
    event: string,
    value: any
}