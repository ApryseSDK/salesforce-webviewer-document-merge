import { LightningElement, wire, track, api } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';
import searchFiles from '@salesforce/apex/PDFTron_ContentVersionController.searchFiles';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class PdftronWvFileBrowserComponent extends NavigationMixin(LightningElement) {
  error;
  isLoading = false;
  hasRecords = false;
  @api tabName;
  @api label;
  @track searchTerm = '';
  @track contentVersions;
  @track selectedRows;
  @wire(CurrentPageReference) pageRef;

  columns = [
    { label: 'File Name', fieldName: 'FileName', sortable: true },
    { label: 'Link', fieldName: 'FileLink' },
    {
      label: 'Last Modified Date', fieldName: 'LastModifiedDate', type: "date", sortable: true,
      typeAttributes: {
        hour12: true,
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }
    },
  ];

  log(...str) {
    console.log(JSON.parse(JSON.stringify(str)));

  }

  getSelectedName(event) {
    this.selectedRows = event.detail.selectedRows;
  }

  handleClick(event) {
    if(!this.selectedRows) {
      this.showNotification('', 'Select a file and click on Open File(s) to load a document in WebViewer.' , 'info');
      return;
    }
    let rows = [];
    this.selectedRows.forEach(row => {
      rows.push(row);
    });
    if (this.selectedRows) {
      let payload = JSON.stringify(rows);
      fireEvent(this.pageRef, 'blobSelected', payload);
      return;
    }
  }

  handleDownloadClick(event) {
    let rows = [];
    this.selectedRows.forEach(row => {
      rows.push(row);
    });
    if (this.selectedRows) {
      let payload = JSON.stringify(rows);
      fireEvent(this.pageRef, 'downloadBlob', payload);
      return;
    }
  }

  navigateToWvInstance(row) {
    this[NavigationMixin.Navigate]({
      type: 'standard__component',
      attributes: {
        componentName: 'c__WebViewerAura'
      },
      state: {
        c__contentVersionId: row.Id,
      }
    })
  }

  handleKeyUp(evt) {
    const isEnterKey = evt.keyCode === 13;
    if (isEnterKey) {
        this.handleSearch();
    }
  }

  handleSearchTerm(event) {
    this.searchTerm = event.detail.value;
  }

  handleSearch() {
    console.log("searchTerm", this.searchTerm);
    if(!this.searchTerm) {
      return;
    }
    this.isLoading = true;
    searchFiles({ searchTerm: this.searchTerm })
      .then(result => {
        console.log("searchResult", result);
        if(result.length === 0) {
          let def_message = 'No files found. Please make sure the filename matches your search term.';
          this.showNotification('No results found!', def_message , 'info');
          this.isLoading = false;
          return;
        }
        
        this.contentVersions = result;

        if(this.contentVersions.length > 0) {
          this.hasRecords = true;
        }

        if(this.isLoading) {
          this.isLoading = false;
        }
      })
      .catch(error => {
        this.error = error;
        console.error(error);
        this.isLoading = false;
        let def_message = 'We have encountered an error while searching your file. '

        this.showNotification('Error', def_message + error.body.message, 'error');
      });
  }

  showNotification(title, message, variant) {
    const evt = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant,
    });
    this.dispatchEvent(evt);
}

  // The method onsort event handler
  updateColumnSorting(event) {

    var fieldName = event.detail.fieldName;
    var sortDirection = event.detail.sortDirection;
    // assign the latest attribute with the sorted column fieldName and sorted direction
    this.sortedBy = fieldName;
    this.sortedDirection = sortDirection;
    this.contentVersions = this.sortData(fieldName, sortDirection);
  }

  sortData(fieldName, sortDirection) {
    console.log(`%c sortData ${fieldName} ${sortDirection} `, 'background: red; color: white;');
    let result;
    // switch (fieldName) {
    //   case 'LastModifiedDate':
    //     result = this.contentVersions.sort((a, b) => b.LastModifiedDate - a.LastModifiedDate)
    //     break;
    //   default:
    //     result = this.contentVersions;
    //     break;
    // }
    return this.contentVersions;
  }
}