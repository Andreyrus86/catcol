import {
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken, JsonMetadata, fetchAllDigitalAssetWithTokenByOwner } from "@metaplex-foundation/mpl-token-metadata";
import dynamic from "next/dynamic";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useUmi } from "../utils/useUmi";
import { fetchCandyMachine, safeFetchCandyGuard, CandyGuard, CandyMachine, AccountVersion } from "@metaplex-foundation/mpl-candy-machine"
import styles from "../styles/Home.module.css";
import {guardChecker, guardCheckerCatalog} from "../utils/checkAllowed";
import { Center, Spinner, Card, CardHeader, CardBody, StackDivider, Heading, Stack, useToast, Text, Skeleton, useDisclosure, Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, Image, ModalHeader, ModalOverlay, Box, Divider, VStack, HStack, Flex } from '@chakra-ui/react';
import { ButtonList } from "../components/mintButton";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import TokenAttributes from "@/utils/tokenAttributes";
import {default as NextJSImage} from 'next/image';

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);


const useCandyMachine = (
  umi: Umi,
  candyMachineId: string,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  firstRun: boolean,
  setfirstRun: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();
  const toast = useToast();


  useEffect(() => {
    (async () => {
      if (checkEligibility) {
        if (!candyMachineId) {
          console.error("No candy machine in .env!");
          if (!toast.isActive("no-cm")) {
            toast({
              id: "no-cm",
              title: "No candy machine in .env!",
              description: "Add your candy machine address to the .env file!",
              status: "error",
              duration: 999999,
              isClosable: true,
            });
          }
          return;
        }

        let candyMachine;
        try {
          candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId));
          //verify CM Version
          if (candyMachine.version != AccountVersion.V2){
            toast({
              id: "wrong-account-version",
              title: "Wrong candy machine account version!",
              description: "Please use latest sugar to create your candy machine. Need Account Version 2!",
              status: "error",
              duration: 999999,
              isClosable: true,
            });
            return;
          }
        } catch (e) {
          console.error(e);
          toast({
            id: "no-cm-found",
            title: "The CM from .env is invalid",
            description: "Are you using the correct environment?",
            status: "error",
            duration: 999999,
            isClosable: true,
          });
        }
        setCandyMachine(candyMachine);
        if (!candyMachine) {
          return;
        }
        let candyGuard;
        try {
          candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority);
        } catch (e) {
          console.error(e);
          toast({
            id: "no-guard-found",
            title: "No Candy Guard found!",
            description: "Do you have one assigned?",
            status: "error",
            duration: 999999,
            isClosable: true,
          });
        }
        if (!candyGuard) {
          return;
        }
        setCandyGuard(candyGuard);
        if (firstRun){
          setfirstRun(false)
        }
      }
    })();
  }, [umi, checkEligibility]);

  return { candyMachine, candyGuard };
};


export default function Home() {
  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const toast = useToast();
  const { isOpen: isShowNftOpen, onOpen: onShowNftOpen, onClose: onShowNftClose } = useDisclosure();
  const { isOpen: isInitializerOpen, onOpen: onInitializerOpen, onClose: onInitializerClose } = useDisclosure();
  const [mintsCreated, setMintsCreated] = useState<{ mint: PublicKey, offChainMetadata: JsonMetadata | undefined }[] | undefined>();
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [ownedTokensAttributes, setOwnedTokensAttributes] = useState<TokenAttributes[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false, maxAmount: 0 },
  ]);
  const [firstRun, setFirstRun] = useState(true);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);
  const [cardInfo, setCardInfo] = useState(null);
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure();
  let modalInfo = null;

  if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
    console.error("No candy machine in .env!")
    if (!toast.isActive('no-cm')) {
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
    }
  }
  const candyMachineId: PublicKey = useMemo(() => {
    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
      return publicKey("11111111111111111111111111111111");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { candyMachine, candyGuard } = useCandyMachine(umi, candyMachineId, checkEligibility, setCheckEligibility, firstRun, setFirstRun);

  useEffect(() => {
    const checkEligibilityFunc = async () => {
      //console.log(candyMachine, candyGuard, checkEligibility, isShowNftOpen);
      if (!candyMachine || !candyGuard || !checkEligibility || isShowNftOpen) {
        return;
      }
      setFirstRun(false);
      
      const { guardReturn, ownedTokens } = await guardChecker(
        umi, candyGuard, candyMachine, solanaTime
      );

      const { guardReturnCatalog, ownedTokensCatalog } = await guardCheckerCatalog(
          umi, candyGuard, candyMachine, solanaTime
      );

      setOwnedTokens(ownedTokens);
      setGuards(guardReturn);
      setIsAllowed(false);

      let allowed = false;
      for (const guard of guardReturn) {
        if (guard.allowed) {
          allowed = true;
          break;
        }
      }

      setIsAllowed(allowed);
      if (ownedTokensCatalog != undefined) {
        let tokenAttributes:TokenAttributes[] = [];
        let nftsList:string[] = [];

        //const response = await fetch('/api/book');
        for(let i = 0; i < ownedTokensCatalog.length; i++) {
          if (ownedTokensCatalog[i].metadata.symbol !== 'TEST') { // todo: NFTCATS
            continue;
          }
          nftsList.push(ownedTokensCatalog[i].metadata.name);
          /*const response = await fetch(ownedTokens[i].metadata.uri);
          const data = await response.json();
          data.attributes.forEach((nft: any) => {
            if (nft.trait_type === 'Number') { // todo: uuid attr
              tokenAttributes.push(new TokenAttributes(ownedTokens[i].publicKey.toString()));
            }
          });*/
        }

        const response = await fetch("/api/book", {
          method: "POST",
          body: JSON.stringify({ "nfts": nftsList }),
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        });
        const data = await response.json();
        data.catalog.forEach((nft: any) => {
          tokenAttributes.push(new TokenAttributes(nft.id, nft.title,nft.id !== null, nft.number, nft.card));
        });

        setOwnedTokensAttributes(tokenAttributes);
        if (nftsList.length) {
          setIsAllowed(true);
        }
      }

      setLoading(false);
    };

    checkEligibilityFunc();
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umi, checkEligibility, firstRun]);

  const allNFTs = async () => {
    let p = await fetchAllDigitalAssetWithTokenByOwner(
        umi,
        umi.identity.publicKey,
    );

    return [];
  };

  const CatalogContent = () => {
    const handleCardClick = async (uuid: string|null) => {
      if (uuid === null) {
        return;
      }

      onOpenModal();

      // Get an additional information
      const response = await fetch("/api/card", {
        method: "POST",
        body: JSON.stringify({ "uuid": uuid }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      const data = await response.json();
      if (response.status !== 200) {
        setCardInfo(null);

        return;
      }

      setCardInfo(data);
    };

    return (
      <div>
        <div className={styles.catalogList__title}>NFT cats</div>
        <div className={styles.catalogList__description}>
          On this page, you can view your collection of NFT cards. Connect your Solana wallet to access the catalog.
          If you are not sure whether an NFT card is right for you, we would appreciate any regular <a href="" className={styles.catalogList__link}>donation</a>. Iam sure that the future is totally related to blockchain and crypto technology, try it.
        </div>
        {isAllowed ? (
                  <section className={styles.catalogList}>
                    {ownedTokensAttributes ?
                        (ownedTokensAttributes.map((nft, index) => (
                            <div key={`nft-${nft.getNumber()}`} className={styles.catalogList__item}>
                              {nft.isOwned() ? (
                                  <div className={styles.emptyCard__cont}>
                                    <p><strong>{nft.getTitle()}</strong></p>
                                    <img src={'data:image/png;base64,'+nft.getBase64Img()} className={styles.catalogList__card} onClick={() => handleCardClick(nft.getUuid())} />
                                  </div>
                              ) : (<div className={styles.emptyCard__cont}>
                                <p>-</p>
                                <div className={styles.emptyCard}></div>
                              </div>)
                              }
                            </div>
                        )))
                        : ""
                    }
                  </section>
        ) : (
            <div className={styles.catalogList__empty}>
              <WalletMultiButtonDynamic />
            </div>
        )}
      </div>
    )
  };

  const PageContent = () => {
    return (
      <>
        <style jsx global>
          {`
      body {
          background: #2d3748; 
       }
   `}
        </style>
        <Card>
          <CardHeader padding={"2"}>
            <Flex minWidth='max-content' alignItems='center' gap='2'>
              {loading ? (<></>) : (
                <Flex justifyContent="flex-start" alignItems={"center"}>
                    <HStack gap='1'>
                      <Text fontSize={"x-small"} >Total available NFT cards left:</Text>
                      <Text fontWeight={"semibold"} fontSize={"x-small"}>{Number(candyMachine?.data.itemsAvailable) - Number(candyMachine?.itemsRedeemed)}/{Number(candyMachine?.data.itemsAvailable)}</Text>
                    </HStack>
                </Flex>
              )}
            </Flex>
          </CardHeader>

          <CardBody>
            <Center>
              <Box
                rounded={'lg'}
                pos={'relative'}>
                <Image
                  rounded={'lg'}
                  height={306}
                  objectFit={'cover'}
                  alt={"cats NFT booster"}
                  src={image}
                />
              </Box>
            </Center>
            <Stack divider={<StackDivider />} spacing='8'>
              {loading ? (
                <div>
                  <Divider my="10px" />
                  <Skeleton height="30px" my="10px" />
                  <Skeleton height="30px" my="10px" />
                  <Skeleton height="30px" my="10px" />
                </div>
              ) : (
                <ButtonList
                  guardList={guards}
                  candyMachine={candyMachine}
                  candyGuard={candyGuard}
                  umi={umi}
                  ownedTokens={ownedTokens}
                  setGuardList={setGuards}
                  mintsCreated={mintsCreated}
                  setMintsCreated={setMintsCreated}
                  onOpen={onShowNftOpen}
                  setCheckEligibility={setCheckEligibility}
                />
              )}
            </Stack>
          </CardBody>
        </Card >
        {umi.identity.publicKey === candyMachine?.authority ? (
          <>
            <Center>
              <Button backgroundColor={"red.200"} marginTop={"10"} onClick={onInitializerOpen}>Initialize Everything!</Button>
            </Center>
            <Modal isOpen={isInitializerOpen} onClose={onInitializerClose}>
              <ModalOverlay />
              <ModalContent maxW="600px">
                <ModalHeader>Initializer</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  < InitializeModal umi={umi} candyMachine={candyMachine} candyGuard={candyGuard} />
                </ModalBody>
              </ModalContent>
            </Modal>

          </>)
          :
          (<></>)
        }

        <Modal isOpen={isShowNftOpen} onClose={onShowNftClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Your minted NFT:</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <ShowNft nfts={mintsCreated} />
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  };

  return (
    <main>
      <Modal isOpen={isOpenModal} onClose={onCloseModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detail info</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {
              cardInfo === null ?
                  (<div>
                    <VStack>
                      <Spinner color="orange.600" />
                      <Text color="orange.600">Loading...</Text>
                    </VStack>
                  </div>)
                : (<div className={styles.photos}>
                    {
                      (<Image src={`data:image/png;base64,${cardInfo.card}`}/>)
                    }
                    {
                      (
                          cardInfo.images.map((imgObj, index) => (
                          <div key={`img-${index}`} className={styles.photos__item}>
                            <Image src={`data:image/jpeg;base64,${imgObj.base64}`}/>
                          </div>
                      )))
                    }
                    {
                      cardInfo.video != false ?
                      (<video controls width="100%">
                        <source src={`/api/video?id=${cardInfo.video}`} type="video/mp4"/>
                      </video>)
                          : (<div></div>)
                    }
                  </div>)
            }
          </ModalBody>

          <ModalFooter>
            <Button colorScheme='blue' mr={3} onClick={() => { setCardInfo(null); onCloseModal(); }}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <div className={styles.content}>
        <div className={styles.catalog}>
          <CatalogContent key="catalog" />
        </div>
        <div className={styles.purchase}>
          <div className={styles.wallet}>
            <WalletMultiButtonDynamic />
          </div>
          <div className={styles.center}>
            <PageContent key="content" />
          </div>
        </div>
      </div>
    </main>
  );
}
