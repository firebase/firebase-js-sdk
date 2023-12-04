This directory contains the data for the "golden" tests for the BloomFilter
class.

It is imperative that the bloom filter implementation here matches exactly that
of the server. The files in this directory are copied from the unit tests for
the server to ensure consistent behavior. They define input for the bloom filter
and the expected results of its mightContain() method.

These files should be kept in sync with those from the backend unit tests.
Googlers see http://google3/cloud/datastore/common/testdata/minion_goldens/.

To update the files in this directory, run the following command:
```
cp /google/src/head/depot/google3/cloud/datastore/common/testdata/minion_goldens/*.json .
```

Then, format the JSON files using `prettier` by running this command:
```
cd ../../../.. && yarn prettier
```
