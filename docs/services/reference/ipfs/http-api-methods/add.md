import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# `add`

## `/api/v0/add`

Add a file or directory to IPFS.

### Request

<Tabs>
  <TabItem value="Syntax" label="Syntax" default>

```bash
curl "https://ipfs.infura.io:5001/api/v0/add?recursive=false&quiet=<value>&quieter=<value>&silent=<value>&progress=<value>&trickle=<value>&only-hash=<value>&wrap-with-directory=<value>&hidden=<value>&chunker=<value>&pin=true&raw-leaves=<value>&nocopy=<value>&fscache=<value>&cid-version=0&hash=sha2-256" \
  -X POST \
  -u "<YOUR-API-KEY>:<YOUR-API-KEY-SECRET>" \
  -H "Content-Type: multipart/form-data" \
  -F file=@"<file>"
```

  </TabItem>
  <TabItem value="Example" label="Example" >

```bash
curl "https://ipfs.infura.io:5001/api/v0/add?pin=false" \
  -X POST \
  -u "<YOUR-API-KEY>:<YOUR-API-KEY-SECRET>" \
  -H "Content-Type: multipart/form-data" \
  -F file=@"/sample-result.json"
```

  </TabItem>
</Tabs>

#### Request parameters

* `file` *\[Required]* - The path to a file to be added to IPFS.
* `quiet` *\[Optional]* - Write minimal output.
* `quieter` *\[Optional]* - Write only final hash.
* `silent` *\[Optional]* - Write no output.
* `progress` *\[Optional]* - Stream progress data.
* `trickle` *\[Optional]* - Use trickle-dag format for dag `generation`.
* `only-hash` *\[Optional]* - Only chunk and hash - do not write to disk.
* `wrap-with-directory` *\[Optional]* - Wrap files with a directory object.
* `pin` *\[Optional]* - Pin this object when adding. The default is `true`.
* `raw-leaves` *\[Optional]* - Use raw blocks for leaf nodes. (Experimental)
* `nocopy` *\[Optional]* - Add the file using filestore. (Experimental)
* `fscache` *\[Optional]* - Check the filestore for pre-existing blocks. (Experimental)
* `cid-version` *\[Optional]*: Cid version. Non-zero value changes the default of `raw-leaves` to `true`. The default is `0`. (Experimental)
* `hash` *\[Optional]*: Hash function to use. Sets `cid-version` to `1` if used. The default is `sha2-256`. (Experimental)

### Response

On success, the call to this endpoint will return with 200 and the following body:

#### Body

```json
{
  "Name": "sample-result.json",
  "Hash": "QmSTkR1kkqMuGEeBS49dxVJjgHRMH6cUYa7D3tcHDQ3ea3",
  "Size": "2120"
}
```

#### Result fields

* `Name` - Name of the object.
* `Hash` - Hash of the uploaded object.
* `Size` - Integer indicating size in bytes.
