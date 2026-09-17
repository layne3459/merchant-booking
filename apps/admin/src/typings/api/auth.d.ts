declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      token: string;
      admin: StoredAdmin;
    }

    interface StoredAdmin {
      id: number;
      username: string;
      role: string;
      shop?: { id: number; name: string };
    }

    interface UserInfo {
      userId: string;
      userName: string;
      roles: string[];
      buttons: string[];
    }
  }
}
