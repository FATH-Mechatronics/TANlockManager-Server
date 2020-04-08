export default class TanLockEvent {
    // UNDEFINED
    public static HEARTBEAT = "heartbeat";
    // 2
    public static BOOT = "boot";
    // 3
    public static PINENTERING = "pinentering";
    // 4
    public static PINTIMEOUT = "pintimeout";
    // 5
    public static PINERROR = "pinerror";
    // 6
    public static UNLOCKING = "handle_unlocking";
    // 7
    public static LOCKING = "handle_locking";
    // 8
    public static OPENING = "handle_opening";
    // 9
    public static CLOSING = "handle_closing";
    // 10
    public static S1_OPEN = "dc1_open";
    // 11
    public static S1_CLOSE = "dc1_close";
    // 12
    public static S2_OPEN = "dc2_open";
    // 13
    public static S2_CLOSE = "dc2_close";
    // 14
    public static SUCCESS_LDAP = "successLDAP_AUTH";
    // 15
    public static SUCCESS_LOCAL = "successLOCAL_AUTH";
    // 16
    public static SUCCESS_MASTER = "successMASTER_AUTH";
}
