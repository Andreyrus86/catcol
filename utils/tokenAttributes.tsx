export default class TokenAttributes {
  protected uuid: string|null = null;
  protected number: number = 0;
  protected title: string|null = null;
  protected owned: boolean = false;
  protected externalImgUrl: string|null = null;

  public constructor(uuid: string|null, title: string|null, owned: boolean, number: number) {
    this.uuid = uuid;
    this.title = title;
    this.owned = owned;
    this.number = number;
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
};
