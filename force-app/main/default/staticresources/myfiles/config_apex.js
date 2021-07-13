var resourceURL = '/resource/'
window.CoreControls.forceBackendType('ems');

var urlSearch = new URLSearchParams(location.hash)
var custom = JSON.parse(urlSearch.get('custom'));
resourceURL = resourceURL + custom.namespacePrefix;

/**
* The following `window.CoreControls.set*` functions point WebViewer to the
* optimized source code specific for the Salesforce platform, to ensure the
* uploaded files stay under the 5mb limit
*/
// office workers
window.CoreControls.setOfficeWorkerPath(resourceURL + 'office')
window.CoreControls.setOfficeAsmPath(resourceURL + 'office_asm');
window.CoreControls.setOfficeResourcePath(resourceURL + 'office_resource');

// pdf workers
window.CoreControls.setPDFResourcePath(resourceURL + 'resource')
if (custom.fullAPI) {
    window.CoreControls.setPDFWorkerPath(resourceURL + 'pdf_full')
    window.CoreControls.setPDFAsmPath(resourceURL + 'asm_full');
} else {
    window.CoreControls.setPDFWorkerPath(resourceURL + 'pdf_lean')
    window.CoreControls.setPDFAsmPath(resourceURL + 'asm_lean');
}

// external 3rd party libraries
window.CoreControls.setExternalPath(resourceURL + 'external')
window.CoreControls.setCustomFontURL('https://pdftron.s3.amazonaws.com/custom/ID-zJWLuhTffd3c/vlocity/webfontsv20/');

async function mergeDocuments(event) {
    const { temprecords } = event.data; //array of documents

    let tifFlag = false;

    let currentIndex = 0;
    let initialDoc = null;

    //load first doc
    if (temprecords[currentIndex].extension === 'tif') {
        tifFlag = true;
        tiffBuffer = await convertFromTif(temprecords[currentIndex].blob);
        initialDoc = await window.CoreControls.createDocument(
            tiffBuffer,
            {
                extension: 'pdf',
                docId: temprecords[currentIndex].documentId,
                filename: temprecords[currentIndex].filename
            }
        );
    } else {
        initialDoc = await window.CoreControls.createDocument(
            temprecords[currentIndex].blob,
            {
                extension: temprecords[currentIndex].extension,
                docId: temprecords[currentIndex].documentId,
                filename: temprecords[currentIndex].filename
            }
        );
    }

    //append other docs if present
    if (temprecords.length > 1) {
        currentIndex = 1;
        let docToBeAdded = null;

        //iterate through remaining docs in array, and add them to first doc
        while (initialDoc && currentIndex < temprecords.length) {
            docToBeAdded = null;

            if (temprecords[currentIndex].extension === 'tif') {
                tifFlag = true;
                tiffBuffer = await convertFromTif(temprecords[currentIndex].blob);
                docToBeAdded = await window.CoreControls.createDocument(
                    tiffBuffer,
                    {
                        extension: 'pdf',
                        docId: temprecords[currentIndex].documentId,
                        filename: temprecords[currentIndex].filename
                    }
                );
                await initialDoc.insertPages(docToBeAdded);
                currentIndex++;
            } else {
                docToBeAdded = await window.CoreControls.createDocument(
                    temprecords[currentIndex].blob,
                    {
                        extension: temprecords[currentIndex].extension,
                        docId: temprecords[currentIndex].documentId,
                        filename: temprecords[currentIndex].filename
                    }
                );
                await initialDoc.insertPages(docToBeAdded);
                currentIndex++;
            }
        }
    }

    if (tifFlag) {
        event.target.readerControl.loadDocument(initialDoc);
    } else {
        const data = await initialDoc.getFileData();
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/pdf' });

        //download file here or do other stuff with blob like sending it out / saving back to database
        downloadFile(blob, "myfile.pdf"); 

        //load document(s) in webviewer
        event.target.readerControl.loadDocument(blob);
    }
    //download document(s)
    //downloadFile(blob, "myfile.pdf"); 
}

const convertFromTif = async (blob) => {
    //requires fullAPI = true;
    if (!blob) {
        return;
    }
    await PDFNet.initialize();
    let doc = null;

    await PDFNet.runWithoutCleanup(async () => {
        // create an empty document
        doc = await PDFNet.PDFDoc.create();
        doc.initSecurityHandler();
        doc.lock();

        let bufferTiff = await blob.arrayBuffer();
        const tiffFile = await PDFNet.Filter.createFromMemory(bufferTiff);
        await PDFNet.Convert.fromTiff(doc, tiffFile);
        const buffer = await doc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
        doc.unlock();
    });
    return doc;
}

const downloadFile = (blob, fileName) => {
    const link = document.createElement('a');
    // create a blobURI pointing to our Blob
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    // some browser needs the anchor to be in the doc
    document.body.append(link);
    link.click();
    link.remove();
    // in case the Blob uses a lot of memory
    setTimeout(() => URL.revokeObjectURL(link.href), 7000);
};

window.addEventListener("documentLoaded", () => {
    //trigger WebViewer prompt for print
    readerControl.print();

    //get current doc, extract data, convert to blob
    const doc = readerControl.documentViewer.getDocument();
    const data = await doc.getFileData();
    const arr = new Uint8Array(data);
    const blob = new Blob([arr], { type: 'application/pdf' });
    
    //download and name blob
    downloadFile(blob, "myfile.pdf"); 
});

window.addEventListener("viewerLoaded", () => {
    //disable UI elements programmatically
    readerControl.disableElements([
        'toolbarGroup-Annotate', //hide annotate
        'toolbarGroup-Shapes', //hide shapes
        'toolbarGroup-Insert', //hide insert
        'toolbarGroup-Edit' //hide edit
        //'anything-else', // right-click + Inspect element -> use data-element html attribute and add it to array for hiding UI components
    ]);
});

window.addEventListener("message", receiveMessage, false);

async function receiveMessage(event) {
    if (event.isTrusted && typeof event.data === 'object') {
        switch (event.data.type) {
            case 'OPEN_DOCUMENT_LIST':
                mergeDocuments(event);
                break;
            default:
                break;
        }
    }
}