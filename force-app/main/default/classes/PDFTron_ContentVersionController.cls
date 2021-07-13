public with sharing class PDFTron_ContentVersionController{
	@AuraEnabled(Cacheable = true)
	public static List<CvWrapper> getAttachments(String recordId) {
		try {
            List<String> cdIdList = new List<String> ();
            List<CvWrapper> cvwList = new List<CvWrapper> ();

            //Define supported file extensions
            Set<String> fileFormats = new Set<String> {
                    'pdf', 
                    'xfdf',
                    'fdf',
                    'docx', 
                    'xlsx',
                    'pptx',
                    'jpg',
                    'jpeg',
                    'png',
                    'mov',
                    'tif',
                    'xlsx'
            };
            //Find links between record & document
            for(ContentDocumentLink cdl : 
                    [   SELECT id, ContentDocumentId, ContentDocument.LatestPublishedVersionId 
                        FROM ContentDocumentLink 
                        WHERE LinkedEntityId = :recordId    ]) {
                cdIdList.add(cdl.ContentDocumentId);
            }
            //Use links to get attachments
            for(ContentVersion cv : 
                    [   SELECT Title, FileExtension, VersionData, ContentDocumentId, LastModifiedDate, ContentSize, LastModifiedBy.Alias
                        FROM ContentVersion 
                        WHERE ContentDocumentId IN :cdIdList 
                        AND IsLatest = true 
						ORDER BY Title ]) {
                if(fileFormats.contains(cv.FileExtension.toLowerCase())) {
                    System.debug('Converting CV: ' + cv.Id);
                    cvwList.add(new CvWrapper(cv));
                    System.debug('Completed CV Conversion:' + cv);
                }
            }
            system.debug(cvwList);
            return cvwList;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	@AuraEnabled(Cacheable = true)
	public static List<CvWrapper> searchAttachments(String searchTerm, String recordId) {
		try {
			searchTerm = '%' + searchTerm + '%'; //show substring results

			List<String> cdIdList = new List<String> ();
            List<CvWrapper> cvwList = new List<CvWrapper> ();

            //Define supported file extensions
            Set<String> fileFormats = new Set<String> {
                    'pdf', 
                    'xfdf',
                    'fdf',
                    'docx', 
                    'xlsx',
                    'pptx',
                    'jpg',
                    'jpeg',
                    'png',
                    'mov',
                    'tif',
                    'xlsx'
            };
            //Find links between record & document
            for(ContentDocumentLink cdl : 
                    [   SELECT id, ContentDocumentId, ContentDocument.LatestPublishedVersionId 
                        FROM ContentDocumentLink 
                        WHERE LinkedEntityId = :recordId    ]) {
                cdIdList.add(cdl.ContentDocumentId);
            }
            //Use links to get attachments
            for(ContentVersion cv : 
                    [   SELECT Title, FileExtension, VersionData, ContentDocumentId, LastModifiedDate, ContentSize, LastModifiedBy.Alias
                        FROM ContentVersion 
                        WHERE ContentDocumentId IN :cdIdList 
						AND Title LIKE :searchTerm
                        AND IsLatest = true 
						ORDER BY Title ]) {
                if(fileFormats.contains(cv.FileExtension.toLowerCase())) {
                    System.debug('Converting CV: ' + cv.Id);
                    cvwList.add(new CvWrapper(cv));
                    System.debug('Completed CV Conversion:' + cv);
                }
            }
            system.debug(cvwList);
            return cvwList;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	@AuraEnabled(Cacheable = true)
	public static List<CvWrapper> searchFiles(String searchTerm) {
		try {
			searchTerm = '%' + searchTerm + '%'; //show substring results

			List<CvWrapper> results = new List<CvWrapper>();

			for (ContentVersion cv : [SELECT Title, FileExtension, VersionData, ContentDocumentId, LastModifiedDate, ContentSize, LastModifiedBy.Alias
			                          FROM ContentVersion
			                          WHERE Title LIKE :searchTerm
			                          ORDER BY LastModifiedDate DESC]){
				results.add(new CvWrapper((ContentVersion)cv));
			}

			return results;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	public class CvWrapper{
		@AuraEnabled
		public String Id{ get; set; }

		@AuraEnabled
		public String FileName{ get; set; }

		@AuraEnabled
		public DateTime LastModifiedDate{ get; set; }

		@AuraEnabled
		public String base64{ get; set; }

		@AuraEnabled
		public String FileExtension{ get; set; }

		@AuraEnabled
		public String FileLink{ get; set; }

		public CvWrapper(ContentVersion cv){
			this.Id = cv.Id;
			this.FileName = cv.Title + '.' + cv.FileExtension;
			this.FileExtension = cv.FileExtension;
			this.LastModifiedDate = cv.LastModifiedDate;
			this.FileLink = URL.getSalesforceBaseUrl().toExternalForm()+'/sfc/servlet.shepherd/document/download/' + cv.ContentDocumentId;
			this.base64 = EncodingUtil.base64Encode(cv.VersionData);
		}
	}
}