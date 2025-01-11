export default class TokenAttributes {
  protected uuid: string|null = null;
  protected number: number = 0;
  protected title: string|null = null;
  protected owned: boolean = false;
  protected externalImgUrl: string|null = null;
  protected base64Img: string|null = null;

  public constructor(uuid: string|null, title: string|null, owned: boolean, number: number, base64Img: string) {
    this.uuid = uuid;
    this.title = title;
    this.owned = owned;
    this.number = number;
    this.base64Img = base64Img;
  }

  getUuid(): string|null {
    return this.uuid;
  }

  getTitle(): string|null {
    return this.title;
  }

  isOwned(): boolean {
    return this.owned;
  }

  getExternalImgUrl(): string|null {
    return this.externalImgUrl;
  }

  getNumber(): number {
    return this.number;
  }

  getBase64Img(): string|null {
    return this.base64Img;
  }
};
