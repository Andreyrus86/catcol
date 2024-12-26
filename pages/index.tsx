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
import { guardChecker } from "../utils/checkAllowed";
import { Center, Spinner, Card, CardHeader, CardBody, StackDivider, Heading, Stack, useToast, Text, Skeleton, useDisclosure, Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, Image, ModalHeader, ModalOverlay, Box, Divider, VStack, HStack, Flex } from '@chakra-ui/react';
import { ButtonList } from "../components/mintButton";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import TokenAttributes from "@/utils/tokenAttributes";

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
      if (!candyMachine || !candyGuard || !checkEligibility || isShowNftOpen) {
        return;
      }
      setFirstRun(false);
      
      const { guardReturn, ownedTokens } = await guardChecker(
        umi, candyGuard, candyMachine, solanaTime
      );

      setOwnedTokens(ownedTokens);
      if (ownedTokens != undefined) {
        let tokenAttributes:TokenAttributes[] = [];
        let nftsList:string[] = [];

        //const response = await fetch('/api/book');
        for(let i = 0; i < ownedTokens.length; i++) {
          if (ownedTokens[i].metadata.symbol !== 'NUMBERS') { // todo: change to collections symbol
            continue;
          }
          nftsList.push(ownedTokens[i].metadata.name);
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
          tokenAttributes.push(new TokenAttributes(nft.id, nft.title,nft.id !== null, nft.number));
        });

        setOwnedTokensAttributes(tokenAttributes);
      }
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
        {isAllowed ? (
                  <section className={styles.catalogList}>
                    {ownedTokensAttributes ?
                        (ownedTokensAttributes.map((nft, index) => (
                            <div key={`nft-${nft.getNumber()}`} className={styles.catalogList__item} onClick={() => handleCardClick(nft.getUuid())}>
                              <p><strong>{nft.getTitle()}</strong></p>
                              <p>Uuid: {nft.getUuid()}</p>
                            </div>
                        )))
                        : ""
                    }
                  </section>
        ) : (
            <div>
              <WalletMultiButtonDynamic />
            </div>
        )}

        Hello {umi.identity.publicKey}
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
              <Box>
                <Heading size='md'>{headerText}</Heading>
              </Box>
              {loading ? (<></>) : (
                <Flex justifyContent="flex-end" marginLeft="auto">
                    <HStack gap='1'>
                      <Text fontSize={"x-small"}>Total available NFT cards:</Text>
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
                mt={-12}
                pos={'relative'}>
                <Image
                  rounded={'lg'}
                  height={230}
                  objectFit={'cover'}
                  alt={"project Image"}
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
          <ModalHeader>Modal Title</ModalHeader>
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
                      (cardInfo.images.map((imgObj, index) => (
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
